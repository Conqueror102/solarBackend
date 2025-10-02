import asyncHandler from "express-async-handler";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import mongoose from "mongoose";
// queue producers (BullMQ)
import { enqueueEmailOrderPlaced, enqueueEmailOrderStatusUpdate, } from "../queues/producers/emailProducers.js";
import { enqueueAdminNewOrderPlaced, enqueueAdminOrderStatusChanged, } from "../queues/producers/adminNotificationProducers.js";
import { enqueueUserOrderStatusNotification, } from "../queues/producers/userNotificationProducers.js";
import { createOrderSchema } from "../validators/order.js";
const NODE_ENV = process.env.NODE_ENV;
export const addOrder = asyncHandler(async (req, res) => {
    const { error } = createOrderSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { orderItems, totalAmount, paymentMethod, shippingAddress, billingAddress } = req.body;
    if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error("No order items");
    }
    if (!shippingAddress || !billingAddress) {
        res.status(400);
        throw new Error("Shipping and billing address are required");
    }
    // Use MongoDB transaction in production only (your original logic)
    const useTxn = NODE_ENV === "production";
    const session = useTxn ? await mongoose.startSession() : null;
    if (session)
        session.startTransaction();
    try {
        const order = new Order({
            user: req.user._id,
            orderItems,
            totalAmount,
            paymentMethod: paymentMethod || "paystack",
            shippingAddress,
            billingAddress,
            // status="New", paymentStatus="Pending" via schema defaults
        });
        const createdOrder = session ? await order.save({ session }) : await order.save();
        // decrement stock
        for (const item of orderItems) {
            const product = session
                ? await Product.findById(item.product).session(session)
                : await Product.findById(item.product);
            if (!product)
                throw new Error("Product not found");
            if (product.stock < item.qty) {
                throw new Error(`Insufficient stock for product: ${product.name}`);
            }
            product.stock -= item.qty;
            if (session)
                await product.save({ session });
            else
                await product.save();
        }
        if (session) {
            await session.commitTransaction();
            session.endSession();
        }
        // fetch user once for email + names
        const user = await User.findById(req.user._id).select("email name");
        const orderId = createdOrder._id.toString();
        const dedupeBase = `order_${orderId}`;
        // OFFLOAD to BullMQ — these are fast "enqueue" calls (non-blocking)
        if (user?.email) {
            await enqueueEmailOrderPlaced({
                to: user.email,
                userName: user.name,
                orderId,
                totalAmount: createdOrder.totalAmount,
                status: createdOrder.status,
                dedupeKey: `${dedupeBase}_email_placed`,
            });
        }
        // Admin fanout (BullMQ worker queries admins or you pass ids in producer)
        await enqueueAdminNewOrderPlaced({
            orderId,
            orderAmount: createdOrder.totalAmount,
            customerName: user?.name ?? "Customer",
            customerEmail: user?.email ?? "",
            dedupeKey: `${dedupeBase}_admin_new-order`,
        });
        res.status(201).json(createdOrder);
    }
    catch (err) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        res.status(400);
        throw new Error(err.message || "Order creation failed");
    }
});
export const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).populate("orderItems.product");
    res.json(orders.map((order) => ({
        ...order.toObject(),
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress,
    })));
});
export const getOrders = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const totalOrders = await Order.countDocuments({});
    const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email")
        .populate("orderItems.product", "name image price");
    res.json({
        orders: orders.map((order) => ({
            ...order.toObject(),
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            shortCode: "#" + order._id.toString().slice(-5),
        })),
        page,
        pages: Math.ceil(totalOrders / limit),
        totalOrders,
    });
});
export const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate("user", "name email")
        .populate("orderItems.product", "name image price");
    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }
    if (req.user.isAdmin || order.user._id.equals(req.user._id)) {
        res.json({
            id: order._id,
            shortCode: "#" + order._id.toString().slice(-5),
            customer: order.user,
            date: order.get("createdAt"),
            status: order.status,
            total: order.totalAmount,
            paymentMethod: order.paymentMethod,
            isPaid: order.isPaid,
            paidAt: order.paidAt,
            paymentStatus: order.paymentStatus,
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            orderItems: order.orderItems.map((item) => ({
                product: {
                    id: item.product._id,
                    name: item.product.name,
                    image: item.product.image,
                    price: item.product.price,
                },
                qty: item.qty,
                price: item.price,
            })),
        });
    }
    res.status(403);
    throw new Error("Not authorized");
});
export const updateOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate("user", "email name");
    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }
    const prevStatus = order.status;
    const prevPaymentStatus = order.paymentStatus;
    const statusChanged = req.body.status && req.body.status !== prevStatus;
    const paymentStatusChanged = req.body.paymentStatus && req.body.paymentStatus !== prevPaymentStatus;
    order.status = req.body.status ?? order.status;
    order.paymentStatus = req.body.paymentStatus ?? order.paymentStatus;
    order.orderItems = req.body.orderItems ?? order.orderItems;
    order.totalAmount = req.body.totalAmount ?? order.totalAmount;
    order.paymentMethod = req.body.paymentMethod ?? order.paymentMethod;
    const updatedOrder = await order.save();
    if ((statusChanged || paymentStatusChanged) && order.user?.email) {
        const orderId = order._id.toString();
        const dedupeBase = `order:${orderId}`;
        // Email offloaded
        await enqueueEmailOrderStatusUpdate({
            to: order.user.email,
            userName: order.user.name,
            orderId,
            totalAmount: order.totalAmount,
            status: order.status,
            paymentStatus: order.paymentStatus,
            dedupeKey: `${dedupeBase}_email_status_${order.status}_${order.paymentStatus ?? ""}`,
        });
        if (statusChanged) {
            // User in-app notification (same as your createOrderStatusNotification)
            await enqueueUserOrderStatusNotification({
                userId: String(order.user?._id ?? order.user),
                orderId,
                status: order.status,
                extra: {
                    paymentStatus: order.paymentStatus,
                    totalAmount: order.totalAmount,
                },
                dedupeKey: `${dedupeBase}_user_status_${order.status}`,
            });
            await enqueueAdminOrderStatusChanged({
                orderId,
                oldStatus: prevStatus,
                newStatus: order.status,
                orderAmount: order.totalAmount,
                customerName: order.user?.name ?? "Customer",
                dedupeKey: `${dedupeBase}_admin_status_${prevStatus}_to_${order.status}`,
            });
        }
    }
    res.json(updatedOrder);
});
export const deleteOrder = asyncHandler(async (_req, res) => {
    const order = await Order.findById(_req.params?.id || _req.params.id);
    if (order) {
        await order.deleteOne();
        res.json({ message: "Order removed" });
    }
    res.status(404);
    throw new Error("Order not found");
});
export const cancelOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate("user", "email name");
    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }
    if (order.status === "Cancelled") {
        res.status(400);
        throw new Error("Order is already cancelled");
    }
    const prevStatus = order.status;
    order.status = "Cancelled";
    const updatedOrder = await order.save();
    const orderId = order._id.toString();
    const dedupeBase = `order:${orderId}`;
    if (order.user?.email) {
        await enqueueEmailOrderStatusUpdate({
            to: order.user.email,
            userName: order.user.name,
            orderId,
            totalAmount: order.totalAmount,
            status: order.status,
            paymentStatus: order.paymentStatus,
            dedupeKey: `${dedupeBase}_email_status_Cancelled`,
        });
    }
    // User notification
    await enqueueUserOrderStatusNotification({
        userId: String(order.user?._id ?? order.user),
        orderId,
        status: "cancelled",
        extra: { totalAmount: order.totalAmount },
        dedupeKey: `${dedupeBase}_user_status_cancelled`,
    });
    // Admin audit
    await enqueueAdminOrderStatusChanged({
        orderId,
        oldStatus: prevStatus,
        newStatus: "Cancelled",
        orderAmount: order.totalAmount,
        customerName: order.user?.name ?? "Customer",
        dedupeKey: `${dedupeBase}_admin_status_${prevStatus}_to_Cancelled`,
    });
    res.json(updatedOrder);
});
