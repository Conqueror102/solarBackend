import asyncHandler from "express-async-handler";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { sendOrderPlacedEmail, sendOrderStatusUpdateEmail } from "../utils/email.js";
import mongoose from "mongoose";
// Read environment variables once at module load time
const NODE_ENV = process.env.NODE_ENV;
import { createOrderStatusNotification, } from "../utils/notificationService.js";
import { notifyNewOrderPlaced, notifyOrderStatusChanged, } from "../utils/adminNotificationService.js";
import { createOrderSchema } from "../validators/order.js";
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
            // leave: status="New", paymentStatus="Pending" via defaults
        });
        const createdOrder = session ? await order.save({ session }) : await order.save();
        for (const item of orderItems) {
            const product = session
                ? await Product.findById(item.product).session(session)
                : await Product.findById(item.product);
            if (!product)
                throw new Error("Product not found");
            if (product.stock < item.qty)
                throw new Error(`Insufficient stock for product: ${product.name}`);
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
        const user = await User.findById(req.user._id);
        if (user?.email) {
            await sendOrderPlacedEmail({ email: user.email, name: user.name }, { _id: createdOrder._id.toString(), totalAmount: createdOrder.totalAmount, status: createdOrder.status });
        }
        if (user) {
            await notifyNewOrderPlaced(createdOrder._id.toString(), createdOrder.totalAmount, user.name, user.email);
        }
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
// NOTE: no payOrder here — payments are handled via Paystack controller
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
    const statusChanged = req.body.status && req.body.status !== order.status;
    const paymentStatusChanged = req.body.paymentStatus && req.body.paymentStatus !== order.paymentStatus;
    order.status = req.body.status ?? order.status;
    order.paymentStatus = req.body.paymentStatus ?? order.paymentStatus;
    order.orderItems = req.body.orderItems ?? order.orderItems;
    order.totalAmount = req.body.totalAmount ?? order.totalAmount;
    order.paymentMethod = req.body.paymentMethod ?? order.paymentMethod;
    const updatedOrder = await order.save();
    if ((statusChanged || paymentStatusChanged) && order.user?.email) {
        await sendOrderStatusUpdateEmail({ email: order.user.email, name: order.user.name }, {
            _id: order._id.toString(),
            totalAmount: order.totalAmount,
            status: order.status,
            paymentStatus: order.paymentStatus,
        });
        if (statusChanged && order.user) {
            await createOrderStatusNotification(order.user.toString(), order._id.toString(), order.status, {
                paymentStatus: order.paymentStatus,
                totalAmount: order.totalAmount,
            });
            const user = await User.findById(order.user);
            if (user) {
                await notifyOrderStatusChanged(order._id.toString(), order.status, req.body.status || order.status, order.totalAmount, user.name);
            }
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
    order.status = "Cancelled";
    const updatedOrder = await order.save();
    if (order.user?.email) {
        await sendOrderStatusUpdateEmail({ email: order.user.email, name: order.user.name }, { _id: order._id.toString(), totalAmount: order.totalAmount, status: order.status });
    }
    await createOrderStatusNotification(order.user._id.toString(), order._id.toString(), "cancelled", {
        totalAmount: order.totalAmount,
    });
    res.json(updatedOrder);
});
