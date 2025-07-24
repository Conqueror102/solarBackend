import asyncHandler from 'express-async-handler';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { sendCustomEmail } from '../utils/email.js';
import { createUserSchema, updateUserSchema } from '../validators/user.js';
const getUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password');
    res.json(users);
});
const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (user) {
        res.json(user);
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const createUser = asyncHandler(async (req, res) => {
    const { error } = createUserSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { name, email, password, role } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    // Only superadmin can create admin or superadmin users
    const creator = req.user;
    const newRole = role || 'user';
    if ((newRole === 'admin' || newRole === 'superadmin') && (!creator || creator.role !== 'superadmin')) {
        res.status(403);
        throw new Error('Only superadmin can create admin or superadmin users');
    }
    const user = await User.create({ name, email, password, role: newRole });
    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
    });
});
const updateUser = asyncHandler(async (req, res) => {
    const { error } = updateUserSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const user = await User.findById(req.params.id);
    if (user) {
        // Only superadmin can promote/demote to admin or superadmin
        const updater = req.user;
        if (req.body.role && (req.body.role === 'admin' || req.body.role === 'superadmin')) {
            if (!updater || updater.role !== 'superadmin') {
                res.status(403);
                throw new Error('Only superadmin can promote/demote to admin or superadmin');
            }
        }
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.password) {
            user.password = req.body.password;
        }
        if (req.body.role) {
            user.role = req.body.role;
        }
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role
        });
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        await user.deleteOne();
        res.json({ message: 'User removed' });
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const getUserSettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json(user.preferences || {});
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const updateUserSettings = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        user.preferences = req.body.preferences || user.preferences;
        await user.save();
        res.json(user.preferences);
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const getAddresses = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json(user.addresses || []);
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const addAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        user.addresses.push(req.body);
        await user.save();
        res.status(201).json(user.addresses);
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const updateAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        const address = user.addresses.find((addr) => addr._id.toString() === req.params.addressId);
        if (address) {
            Object.assign(address, req.body);
            await user.save();
            res.json(user.addresses);
        }
        else {
            res.status(404);
            throw new Error('Address not found');
        }
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const deleteAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        user.addresses = user.addresses.filter((addr) => addr._id.toString() !== req.params.addressId);
        await user.save();
        res.json(user.addresses);
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const setDefaultAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        user.addresses.forEach((addr) => { addr.isDefault = false; });
        const address = user.addresses.find((addr) => addr._id.toString() === req.params.addressId);
        if (address) {
            address.isDefault = true;
            await user.save();
            res.json(user.addresses);
        }
        else {
            res.status(404);
            throw new Error('Address not found');
        }
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const deactivateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        if (user.isDeactivated) {
            res.status(400);
            throw new Error('User is already deactivated');
        }
        user.isDeactivated = true;
        await user.save();
        res.json({ message: 'User account deactivated' });
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const reactivateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        if (!user.isDeactivated) {
            res.status(400);
            throw new Error('User is already active');
        }
        user.isDeactivated = false;
        await user.save();
        res.json({ message: 'User account reactivated' });
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const getCustomerAnalytics = asyncHandler(async (req, res) => {
    // Get all non-admin, non-deactivated users
    const users = await User.find({ role: 'user', isDeactivated: false }).select('-password');
    const userIds = users.map(u => u._id);
    // Aggregate orders by user
    const orders = await Order.aggregate([
        { $match: { user: { $in: userIds } } },
        { $group: {
                _id: '$user',
                totalSpend: { $sum: '$totalAmount' },
                orderCount: { $sum: 1 },
                lastOrderDate: { $max: '$createdAt' },
                orders: { $push: { totalAmount: '$totalAmount', createdAt: '$createdAt' } }
            } }
    ]);
    // Map userId to order stats
    const orderMap = new Map();
    orders.forEach(o => orderMap.set(o._id.toString(), o));
    // Calculate metrics and RFM
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    let newThisMonth = 0;
    const customers = users.map(user => {
        const stats = orderMap.get(user._id.toString()) || {};
        const totalSpend = stats.totalSpend || 0;
        const orderCount = stats.orderCount || 0;
        const lastOrderDate = stats.lastOrderDate || null;
        const aov = orderCount > 0 ? totalSpend / orderCount : 0;
        // Recency: days since last order (lower is better)
        let recencyScore = 1;
        if (lastOrderDate) {
            const days = (now.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
            if (days <= 7)
                recencyScore = 5;
            else if (days <= 30)
                recencyScore = 4;
            else if (days <= 90)
                recencyScore = 3;
            else if (days <= 180)
                recencyScore = 2;
            else
                recencyScore = 1;
        }
        // Frequency: number of orders (higher is better)
        let frequencyScore = 1;
        if (orderCount >= 10)
            frequencyScore = 5;
        else if (orderCount >= 5)
            frequencyScore = 4;
        else if (orderCount >= 3)
            frequencyScore = 3;
        else if (orderCount >= 2)
            frequencyScore = 2;
        // Monetary: total spend (higher is better)
        let monetaryScore = 1;
        if (totalSpend >= 2000)
            monetaryScore = 5;
        else if (totalSpend >= 1000)
            monetaryScore = 4;
        else if (totalSpend >= 500)
            monetaryScore = 3;
        else if (totalSpend >= 200)
            monetaryScore = 2;
        // New this month
        if (user.createdAt && user.createdAt >= monthAgo)
            newThisMonth++;
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            totalSpend,
            orderCount,
            aov,
            lastOrderDate,
            recencyScore,
            frequencyScore,
            monetaryScore,
            rfm: `${recencyScore}${frequencyScore}${monetaryScore}`
        };
    });
    // Calculate overall metrics
    const totalCustomers = customers.length;
    const vipCustomers = customers.filter(c => c.rfm === '555').length;
    const avgOrderValue = customers.reduce((sum, c) => sum + c.aov, 0) / (customers.length || 1);
    res.json({
        totalCustomers,
        vipCustomers,
        newThisMonth,
        avgOrderValue,
        customers
    });
});
const sendEmailToCustomer = asyncHandler(async (req, res) => {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
        res.status(400);
        throw new Error('Missing to, subject, or html in request body');
    }
    await sendCustomEmail(to, subject, html);
    res.json({ message: 'Email(s) sent successfully' });
});
const getCustomerProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || user.role !== 'user') {
        res.status(404);
        throw new Error('Customer not found');
    }
    // Get total orders, total spent, and recent orders
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const recentOrders = orders.slice(0, 5).map(o => ({
        orderId: o._id.toString().slice(-4),
        date: o.createdAt,
        total: o.totalAmount,
        status: o.status
    }));
    // Get default address and phone if available
    const defaultAddress = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0] || null;
    res.json({
        name: user.name,
        email: user.email,
        phone: user.preferences?.phone || '',
        address: defaultAddress,
        createdAt: user.createdAt || null,
        isDeactivated: user.isDeactivated,
        totalOrders,
        totalSpent,
        recentOrders
    });
});
export { getUsers, getUserById, createUser, updateUser, deleteUser, getUserSettings, updateUserSettings, getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, deactivateUser, reactivateUser, getCustomerAnalytics, sendEmailToCustomer, getCustomerProfile };
