/**
 * orderController.js
 * ------------------
 * Handles order creation, fetching, and payment integration (Stripe).
 */
import asyncHandler from 'express-async-handler';
import { Order } from '../models/Order.js';
import Stripe from 'stripe';
import { User } from '../models/User.js';
import { sendOrderPlacedEmail, sendOrderStatusUpdateEmail } from '../utils/email.js';
import { Settings } from '../models/Settings.js';
import { sendCustomEmail } from '../utils/email.js';
import { createOrderSchema } from '../validators/order.js';
import mongoose from 'mongoose';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });
const addOrder = asyncHandler(async (req, res) => {
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
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Create order
        const order = new Order({
            user: req.user._id,
            orderItems,
            totalAmount,
            paymentMethod,
            shippingAddress,
            billingAddress,
        });
        const createdOrder = await order.save({ session });
        // Update product stock
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
        const user = await User.findById(req.user._id);
        if (user && user.email) {
            await sendOrderPlacedEmail({ email: user.email, name: user.name }, { _id: createdOrder._id.toString(), totalAmount: createdOrder.totalAmount, status: createdOrder.status });
        }
        // Send new order notification to admins
        const settings = await Settings.findOne();
        const adminEmails = settings?.notificationEmails && settings.notificationEmails.length > 0
            ? settings.notificationEmails
            : (await User.find({ isAdmin: true })).map(a => a.email);
        if (adminEmails.length > 0) {
            const html = `<h2>New Order Placed</h2><p>Order <b>#${createdOrder._id.toString().slice(-5)}</b> by ${user?.name || 'Customer'} for <b>$${createdOrder.totalAmount.toFixed(2)}</b>.</p>`;
            await sendCustomEmail(adminEmails, 'New Order Notification', html);
        }
        res.status(201).json(createdOrder);
    }
    catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400);
        throw new Error(err.message || 'Order creation failed');
    }
});
const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).populate('orderItems.product');
    res.json(orders.map((order) => ({
        ...order.toObject(),
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress
    })));
});
const payOrder = asyncHandler(async (req, res) => {
    const { amount, currency, source } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method: source,
        confirm: true,
    });
    res.status(200).json({ success: true, paymentIntent });
});
const getOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({}).populate('user', 'name email');
    res.json(orders.map((order) => ({
        ...order.toObject(),
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress
    })));
});
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name email')
        .populate('orderItems.product', 'name image price');
    if (order) {
        if (req.user.isAdmin || order.user._id.equals(req.user._id)) {
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
                orderItems: order.orderItems.map((item) => ({
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
        }
        else {
            res.status(403);
            throw new Error('Not authorized');
        }
    }
    else {
        res.status(404);
        throw new Error('Order not found');
    }
});
const updateOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate('user', 'email name');
    if (order) {
        order.status = req.body.status || order.status;
        order.orderItems = req.body.orderItems || order.orderItems;
        order.totalAmount = req.body.totalAmount || order.totalAmount;
        order.paymentMethod = req.body.paymentMethod || order.paymentMethod;
        const updatedOrder = await order.save();
        // Send status update email to user
        if (order.user && order.user.email) {
            await sendOrderStatusUpdateEmail({ email: order.user.email, name: order.user.name }, { _id: order._id.toString(), totalAmount: order.totalAmount, status: order.status });
        }
        res.json(updatedOrder);
    }
    else {
        res.status(404);
        throw new Error('Order not found');
    }
});
const deleteOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
        await order.deleteOne();
        res.json({ message: 'Order removed' });
    }
    else {
        res.status(404);
        throw new Error('Order not found');
    }
});
const cancelOrder = asyncHandler(async (req, res) => {
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
    if (order.user && order.user.email) {
        await sendOrderStatusUpdateEmail({ email: order.user.email, name: order.user.name }, { _id: order._id.toString(), totalAmount: order.totalAmount, status: order.status });
    }
    res.json(updatedOrder);
});
// GET /api/orders
// Admin only: Get all orders with pagination, filtering, and sorting
const getAllOrders = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
    // Build filter object
    const filter = {};
    if (status)
        filter.status = status;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate)
            filter.createdAt.$gte = startDate;
        if (endDate)
            filter.createdAt.$lte = endDate;
    }
    const totalOrders = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email');
    res.json({
        orders: orders.map(order => ({
            id: order._id,
            shortCode: '#' + order._id.toString().slice(-5),
            customer: order.user,
            date: order.get('createdAt'),
            status: order.status,
            total: order.totalAmount
        })),
        page,
        pages: Math.ceil(totalOrders / limit),
        totalOrders
    });
});
export { addOrder, getMyOrders, payOrder, getOrders, getOrderById, updateOrder, deleteOrder, getAllOrders, cancelOrder };
