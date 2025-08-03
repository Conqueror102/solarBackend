
/**
 * orderController.js
 * ------------------
 * Handles order creation, fetching, and payment integration (Stripe).
 */
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { Order } from '../models/Order.js';
import Stripe from 'stripe';
import { User } from '../models/User.js';
import { sendOrderPlacedEmail, sendOrderStatusUpdateEmail } from '../utils/email.js';
import { Settings } from '../models/Settings.js';
import { sendCustomEmail } from '../utils/email.js';
import { createOrderSchema } from '../validators/order.js';
import mongoose from 'mongoose';
import { createOrderStatusNotification, createPaymentSuccessNotification, createPaymentFailedNotification } from '../utils/notificationService.js';
import { notifyNewOrderPlaced, notifyOrderStatusChanged, notifyPaymentReceived, notifyPaymentFailed } from '../utils/adminNotificationService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2022-11-15' });

const addOrder = asyncHandler(async (req: Request, res: Response) => {
    const { error } = createOrderSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { orderItems, totalAmount, paymentMethod, shippingAddress, billingAddress } = req.body;
    if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error('No order items');
    }
    if (!shippingAddress || !billingAddress) {
        res.status(400);
        throw new Error('Shipping and billing address are required');
    }

    // Only use session/transaction in production
    if (process.env.NODE_ENV === 'production') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Create order
            const order = new Order({
                user: (req as any).user._id,
                orderItems,
                totalAmount,
                paymentMethod,
                shippingAddress,
                billingAddress,
            });
            const createdOrder = await order.save({ session });

            for (const item of orderItems) {
                const product = await (await import('../models/Product.js')).Product.findById(item.product).session(session);
                if (!product) {
                    throw new Error('Product not found');
                }
                if (product.stock < item.qty) {
                    throw new Error(`Insufficient stock for product: ${product.name}`);
                }
                product.stock -= item.qty;
                await product.save({ session });
            }
            await session.commitTransaction();
            session.endSession();
            // Fetch user email
            const user = await User.findById((req as any).user._id);
            if (user && user.email) {
                await sendOrderPlacedEmail({ email: user.email, name: user.name }, { _id: createdOrder._id.toString(), totalAmount: createdOrder.totalAmount, status: createdOrder.status });
            }
            // Send new order notification to admins
            if (user) {
                await notifyNewOrderPlaced(
                    createdOrder._id.toString(),
                    createdOrder.totalAmount,
                    user.name,
                    user.email
                );
            }
            res.status(201).json(createdOrder);
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            res.status(400);
            throw new Error((err as Error).message || 'Order creation failed');
        }
    } else {
        // Development: no session/transaction
        try {
            const order = new Order({
                user: (req as any).user._id,
                orderItems,
                totalAmount,
                paymentMethod,
                shippingAddress,
                billingAddress,
            });
            const createdOrder = await order.save();

            for (const item of orderItems) {
                const product = await (await import('../models/Product.js')).Product.findById(item.product);
                if (!product) {
                    throw new Error('Product not found');
                }
                if (product.stock < item.qty) {
                    throw new Error(`Insufficient stock for product: ${product.name}`);
                }
                product.stock -= item.qty;
                await product.save();
            }
            // Fetch user email
            const user = await User.findById((req as any).user._id);
            if (user && user.email) {
                await sendOrderPlacedEmail({ email: user.email, name: user.name }, { _id: createdOrder._id.toString(), totalAmount: createdOrder.totalAmount, status: createdOrder.status });
            }
            // Send new order notification to admins
            if (user) {
                await notifyNewOrderPlaced(
                    createdOrder._id.toString(),
                    createdOrder.totalAmount,
                    user.name,
                    user.email
                );
            }
            res.status(201).json(createdOrder);
        } catch (err) {
            res.status(400);
            throw new Error((err as Error).message || 'Order creation failed');
        }
    }
});

const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const orders = await Order.find({ user: (req as any).user._id }).populate('orderItems.product');
    res.json(orders.map((order: any) => ({
        ...order.toObject(),
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress
    })));
});

const payOrder = asyncHandler(async (req: Request, res: Response) => {
    const { orderId, currency, source } = req.body;

    // Find the order and verify it exists
    const order = await Order.findById(orderId);
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Verify the order belongs to the user
    if (!order.user.equals((req as any).user._id)) {
        res.status(403);
        throw new Error('Not authorized');
    }

    // Check if order is already paid
    if (order.isPaid) {
        res.status(400);
        throw new Error('Order is already paid');
    }

    // Convert order total to cents for Stripe
    const amount = Math.round(order.totalAmount * 100);

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            payment_method: source,
            confirm: true,
            description: `Order #${order._id.toString().slice(-5)}`,
            metadata: {
                orderId: order._id.toString()
            }
        });

        if (paymentIntent.status === 'succeeded') {
            // Update payment status
            order.isPaid = true;
            order.paidAt = new Date();
            order.paymentStatus = 'Completed';
            order.status = 'Processing';
            await order.save();

            // Send email notification
            const user = await User.findById(order.user);
            if (user && user.email) {
                await sendOrderStatusUpdateEmail(
                    { email: user.email, name: user.name },
                    { 
                        _id: order._id.toString(),
                        totalAmount: order.totalAmount,
                        status: order.status,
                        paymentStatus: order.paymentStatus
                    }
                );
            }

            res.status(200).json({ 
                success: true, 
                paymentIntent,
                order: {
                    id: order._id,
                    status: order.status,
                    paymentStatus: order.paymentStatus,
                    isPaid: order.isPaid,
                    paidAt: order.paidAt
                }
            });
        } else {
            res.status(400);
            throw new Error('Payment failed');
        }
    } catch (error: any) {
        // Update payment status to failed
        order.paymentStatus = 'Failed';
        await order.save();

        // Send payment failure email
        const user = await User.findById(order.user);
        if (user && user.email) {
            await sendOrderStatusUpdateEmail(
                { email: user.email, name: user.name },
                { 
                    _id: order._id.toString(),
                    totalAmount: order.totalAmount,
                    status: order.status,
                    paymentStatus: order.paymentStatus
                }
            );
        }

        res.status(400);
        throw new Error(error.message || 'Payment failed');
    }
});

const getOrders = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({});
    const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('orderItems.product', 'name image price');

    res.json({
        orders: orders.map((order: any) => ({
            ...order.toObject(),
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            shortCode: '#' + order._id.toString().slice(-5)
        })),
        page,
        pages: Math.ceil(totalOrders / limit),
        totalOrders
    });
});

const getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name email')
        .populate('orderItems.product', 'name image price');
    if (order) {
        if ((req as any).user.isAdmin || order.user._id.equals((req as any).user._id)) {
            res.json({
                id: order._id,
                shortCode: '#' + order._id.toString().slice(-5),
                customer: order.user,
                date: order.get('createdAt'),
                status: order.status,
                total: order.totalAmount,
                paymentMethod: order.paymentMethod,
                isPaid: order.isPaid,
                paidAt: order.paidAt,
                shippingAddress: order.shippingAddress,
                billingAddress: order.billingAddress,
                orderItems: order.orderItems.map((item: any) => ({
                    product: {
                        id: item.product._id,
                        name: item.product.name,
                        image: item.product.image,
                        price: item.product.price
                    },
                    qty: item.qty,
                    price: item.price
                }))
            });
        } else {
            res.status(403);
            throw new Error('Not authorized');
        }
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

const updateOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await Order.findById(req.params.id).populate('user', 'email name');
    if (order) {
        // Track if status changed
        const statusChanged = req.body.status && req.body.status !== order.status;
        const paymentStatusChanged = req.body.paymentStatus && req.body.paymentStatus !== order.paymentStatus;

        // Update order fields
        order.status = req.body.status || order.status;
        order.paymentStatus = req.body.paymentStatus || order.paymentStatus;
        order.orderItems = req.body.orderItems || order.orderItems;
        order.totalAmount = req.body.totalAmount || order.totalAmount;
        order.paymentMethod = req.body.paymentMethod || order.paymentMethod;
        const updatedOrder = await order.save();

        // Send status update email to user if either status changed
        if ((statusChanged || paymentStatusChanged) && order.user && (order.user as any).email) {
            await sendOrderStatusUpdateEmail(
                { email: (order.user as any).email, name: (order.user as any).name },
                { 
                    _id: order._id.toString(), 
                    totalAmount: order.totalAmount, 
                    status: order.status,
                    paymentStatus: order.paymentStatus
                }
            );
            
            // Create notification for order status update
            if (statusChanged && order.user) {
                await createOrderStatusNotification(
                    order.user.toString(),
                    order._id.toString(),
                    order.status,
                    {
                        paymentStatus: order.paymentStatus,
                        totalAmount: order.totalAmount
                    }
                );
                
                // Notify admins about order status change
                const user = await User.findById(order.user);
                if (user) {
                    await notifyOrderStatusChanged(
                        order._id.toString(),
                        req.body.status || order.status,
                        order.status,
                        order.totalAmount,
                        user.name
                    );
                }
            }
        }

        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await Order.findById(req.params.id);
    if (order) {
        await order.deleteOne();
        res.json({ message: 'Order removed' });
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await Order.findById(req.params.id).populate('user', 'email name');
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }
    if (order.status === 'Cancelled') {
        res.status(400);
        throw new Error('Order is already cancelled');
    }
    order.status = 'Cancelled';
    const updatedOrder = await order.save();
    // Send cancellation email
    if (order.user && (order.user as any).email) {
        await sendOrderStatusUpdateEmail(
            { email: (order.user as any).email, name: (order.user as any).name },
            { _id: order._id.toString(), totalAmount: order.totalAmount, status: order.status }
        );
    }
    
    // Create notification for order cancellation
    if (order.user) {
        await createOrderStatusNotification(
            order.user._id.toString(),
            order._id.toString(),
            'cancelled',
            {
                totalAmount: order.totalAmount
            }
        );
    }
    res.json(updatedOrder);
});

// GET /api/orders
// Admin only: Get all orders with pagination, filtering, and sorting
const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Build filter object
    const filter: any = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = startDate;
        if (endDate) filter.createdAt.$lte = endDate;
    }

    const totalOrders = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('orderItems.product', 'name image price');

    res.json({
        orders: orders.map((order: any) => ({
            ...order.toObject(),
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            shortCode: '#' + order._id.toString().slice(-5)
        })),
        page,
        pages: Math.ceil(totalOrders / limit),
        totalOrders
    });
});

export { addOrder, getMyOrders, payOrder, getOrders, getOrderById, updateOrder, deleteOrder, getAllOrders, cancelOrder };
