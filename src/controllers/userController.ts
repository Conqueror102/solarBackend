// src/controllers/userController.ts
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { sendCustomEmail } from '../utils/email.js';
import { createUserSchema, updateUserSchema } from '../validators/user.js';

// Queue producers (admin notifications)
import {
  enqueueAdminNewUserRegistration,
  enqueueAdminUserActivity,
} from '../queues/producers/adminNotificationProducers.js';

/**
 * Get all users
 */
const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

/**
 * Get user by ID
 */
const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(user);
});

/**
 * Create new user (admin/superadmin only)
 */
const createUser = asyncHandler(async (req: Request, res: Response) => {
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

  const creator = (req as any).user;
  const newRole = role || 'user';

  if ((newRole === 'admin' || newRole === 'superadmin') && (!creator || creator.role !== 'superadmin')) {
    res.status(403);
    throw new Error('Only superadmin can create admin or superadmin users');
  }

  const user = await User.create({ name, email, password, role: newRole });

  // 🔔 enqueue admin notification
  await enqueueAdminNewUserRegistration({
    userId: user._id.toString(),
    userName: user.name,
    userEmail: user.email,
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

/**
 * Update user
 */
const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { error } = updateUserSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const updater = (req as any).user;

  // Only superadmin can promote/demote to admin or superadmin
  if (req.body.role && (req.body.role === 'admin' || req.body.role === 'superadmin')) {
    if (!updater || updater.role !== 'superadmin') {
      res.status(403);
      throw new Error('Only superadmin can promote/demote to admin or superadmin');
    }
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  if (req.body.password) user.password = req.body.password;
  if (req.body.role) user.role = req.body.role;

  const updatedUser = await user.save();

  // 🔔 enqueue admin user activity
  await enqueueAdminUserActivity({
    activityType: 'user_updated',
    userName: updatedUser.name,
    userEmail: updatedUser.email,
    details: `User ${updatedUser._id} updated by ${updater?.name || 'system'}`,
    changes: Object.keys(req.body),
  });

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
  });
});

/**
 * Delete user
 */
const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.deleteOne();

  // 🔔 enqueue admin user activity
  await enqueueAdminUserActivity({
    activityType: 'user_deleted',
    userName: user.name,
    userEmail: user.email,
    details: `User ${user._id} deleted`,
  });

  res.json({ message: 'User removed' });
});

/**
 * Get user settings (preferences)
 */


const getUserSettings = asyncHandler(async (req: Request, res: Response) => {
  // FIX: Use the user object directly from the middleware
  const user = (req as any).user;
  if (user) {
      res.json(user.preferences || {});
  } else {
      res.status(401);
      throw new Error('Not authorized');
  }
});

// const getUserSettings = asyncHandler(async (req: Request, res: Response) => {
//   const user = await User.findById((req as any).user._id);
//   if (!user) {
//     res.status(404);
//     throw new Error('User not found');
//   }
//   res.json(user.preferences || {});
// });

/**
 * Update user settings (preferences)
 */

const updateUserSettings = asyncHandler(async (req: Request, res: Response) => {
  // FIX: Use the user object directly from the middleware
  const user = (req as any).user;
  if (user) {
      user.preferences = req.body.preferences || user.preferences;
      await user.save();
      res.json(user.preferences);
  } else {
      res.status(401);
      throw new Error('Not authorized');
  }
});

// const updateUserSettings = asyncHandler(async (req: Request, res: Response) => {
//   const user = await User.findById((req as any).user._id);
//   if (!user) {
//     res.status(404);
//     throw new Error('User not found');
//   }
//   user.preferences = req.body.preferences || user.preferences;
//   await user.save();
//   res.json(user.preferences);
// });

/**
 * Get addresses
 */
const getAddresses = asyncHandler(async (req: Request, res: Response) => {
    // The protect middleware attaches the full user document to req.user
    // So req.user._id contains the user ID
    const user = (req as any).user;
    
    console.log("User from protect middleware:", user);
    console.log("User ID:", user._id);
    console.log("Type of user._id:", typeof user._id);
    
    // The user is already fetched by the protect middleware
    // But if you need to refetch with addresses specifically:
    const userWithAddresses = await User.findById(user._id).select("addresses");
    
    if (!userWithAddresses) {
      res.status(404);
      throw new Error("User not found");
    }
  
    res.json(userWithAddresses.addresses || []);
});

// const getAddresses = asyncHandler(async (req: Request, res: Response) => {
//   const user = await User.findById((req as any).user._id);
//   if (!user) {
//     res.status(404);
//     throw new Error('User not found');
//   }
//   res.json(user.addresses || []);
// });

/**
 * Add address
 */

const addAddress = asyncHandler(async (req: Request, res: Response) => {
  // FIX: Use the user object directly from the middleware
  const user = (req as any).user;
  if (user) {
    user.addresses.push(req.body);
    await user.save();
    res.status(201).json(user.addresses);
  } else {
    res.status(401);
    throw new Error('Not authorized');
  }
});

// const addAddress = asyncHandler(async (req: Request, res: Response) => {
//   const user = await User.findById((req as any).user._id);
//   if (!user) {
//     res.status(404);
//     throw new Error('User not found');
//   }
//   user.addresses.push(req.body);
//   await user.save();
//   res.status(201).json(user.addresses);
// });

/**
 * Update address
 */

const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  // FIX: Use the user object directly from the middleware
  const user = (req as any).user;
  if (user) {
    const address = user.addresses.find((addr: any) => addr._id.toString() === req.params.addressId);
    if (!address) {
      res.status(404);
      throw new Error('Address not found');
    }
    Object.assign(address, req.body);
    await user.save();
    res.json(user.addresses);
  } else {
    res.status(401);
    throw new Error('Not authorized');
  }
});

// const updateAddress = asyncHandler(async (req: Request, res: Response) => {
//   const user = await User.findById((req as any).user._id);
//   if (!user) {
//     res.status(404);
//     throw new Error('User not found');
//   }

//   const address = user.addresses.find((addr: any) => addr._id.toString() === req.params.addressId);
//   if (!address) {
//     res.status(404);
//     throw new Error('Address not found');
//   }

//   Object.assign(address, req.body);
//   await user.save();
//   res.json(user.addresses);
// });

/**
 * Delete address
 */

const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  // FIX: Use the user object directly from the middleware
  const user = (req as any).user;
  if (user) {
    user.addresses = user.addresses.filter((addr: any) => addr._id.toString() !== req.params.addressId);
    await user.save();
    res.json({ message: 'Address removed successfully' });
  } else {
    res.status(401);
    throw new Error('Not authorized');
  }
});

// const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
//   const user = await User.findById((req as any).user._id);
//   if (!user) {
//     res.status(404);
//     throw new Error('User not found');
//   }
//   user.addresses = user.addresses.filter((addr: any) => addr._id.toString() !== req.params.addressId);
//   await user.save();
//   res.json(user.addresses);
// });

/**
 * Set default address
 */

const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  // FIX: Use the user object directly from the middleware
  const user = (req as any).user;
  if (user) {
    user.addresses.forEach((addr: any) => { addr.isDefault = false; });
    const address = user.addresses.find((addr: any) => addr._id.toString() === req.params.addressId);
    if (!address) {
      res.status(404);
      throw new Error('Address not found');
    }
    address.isDefault = true;
    await user.save();
    res.json(user.addresses);
  } else {
    res.status(401);
    throw new Error('Not authorized');
  }
});

// const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
//   const user = await User.findById((req as any).user._id);
//   if (!user) {
//     res.status(404);
//     throw new Error('User not found');
//   }

//   user.addresses.forEach((addr: any) => { addr.isDefault = false; });
//   const address = user.addresses.find((addr: any) => addr._id.toString() === req.params.addressId);

//   if (!address) {
//     res.status(404);
//     throw new Error('Address not found');
//   }

//   address.isDefault = true;
//   await user.save();
//   res.json(user.addresses);
// });

/**
 * Deactivate user
 */
const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.isDeactivated) {
    res.status(400);
    throw new Error('User is already deactivated');
  }

  user.isDeactivated = true;
  await user.save();

  // 🔔 enqueue admin user activity
  await enqueueAdminUserActivity({
    activityType: 'user_deactivated',
    userName: user.name,
    userEmail: user.email,
    details: `User ${user._id} was deactivated`,
  });

  res.json({ message: 'User account deactivated' });
});

/**
 * Reactivate user
 */
const reactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (!user.isDeactivated) {
    res.status(400);
    throw new Error('User is already active');
  }

  user.isDeactivated = false;
  await user.save();

  // 🔔 enqueue admin user activity
  await enqueueAdminUserActivity({
    activityType: 'user_reactivated',
    userName: user.name,
    userEmail: user.email,
    details: `User ${user._id} was reactivated`,
  });

  res.json({ message: 'User account reactivated' });
});

/**
 * Customer analytics summary + per-customer scores
 */
const getCustomerAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find({ role: 'user', isDeactivated: false }).select('-password');
  const userIds = users.map(u => u._id);

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

  const orderMap = new Map<string, any>();
  orders.forEach(o => orderMap.set(o._id.toString(), o));

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

    let recencyScore = 1;
    if (lastOrderDate) {
      const days = (now.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
      if (days <= 7) recencyScore = 5;
      else if (days <= 30) recencyScore = 4;
      else if (days <= 90) recencyScore = 3;
      else if (days <= 180) recencyScore = 2;
      else recencyScore = 1;
    }

    let frequencyScore = 1;
    if (orderCount >= 10) frequencyScore = 5;
    else if (orderCount >= 5) frequencyScore = 4;
    else if (orderCount >= 3) frequencyScore = 3;
    else if (orderCount >= 2) frequencyScore = 2;

    let monetaryScore = 1;
    if (totalSpend >= 2000) monetaryScore = 5;
    else if (totalSpend >= 1000) monetaryScore = 4;
    else if (totalSpend >= 500) monetaryScore = 3;
    else if (totalSpend >= 200) monetaryScore = 2;

    if (user.createdAt && user.createdAt >= monthAgo) newThisMonth++;

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
      rfm: `${recencyScore}${frequencyScore}${monetaryScore}`,
    };
  });

  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c => c.rfm === '555').length;
  const avgOrderValue = customers.reduce((sum, c) => sum + c.aov, 0) / (customers.length || 1);

  res.json({
    totalCustomers,
    vipCustomers,
    newThisMonth,
    avgOrderValue,
    customers,
  });
});

/**
 * Admin tool: send a custom email (kept inline as requested)
 */
const sendEmailToCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    res.status(400);
    throw new Error('Missing to, subject, or html in request body');
  }
  await sendCustomEmail(to, subject, html);
  res.json({ message: 'Email(s) sent successfully' });
});

/**
 * Get all customers with pagination, search, and filtering
 */
const getAllCustomers = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search as string;
  const status = req.query.status as string;
  const skip = (page - 1) * limit;

  const filter: any = { role: 'user' };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (status === 'active') {
    filter.isDeactivated = false;
  } else if (status === 'deactivated') {
    filter.isDeactivated = true;
  }

  const customers = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(filter);

  const customersWithStats = await Promise.all(
    customers.map(async (customer) => {
      const orders = await Order.find({ user: customer._id });
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const lastOrder = orders.length > 0 ? orders[0] : null;

      const initials = customer.name
        .split(' ')
        .map((w) => w.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return {
        _id: customer._id,
        initials,
        name: customer.name,
        email: customer.email,
        phone: customer.preferences?.phone || '',
        joinedDate: customer.createdAt,
        totalOrders,
        totalSpent,
        lastOrderDate: lastOrder?.createdAt || null,
        status: customer.isDeactivated ? 'Deactivated' : 'Active',
        isDeactivated: customer.isDeactivated,
        emailVerified: customer.emailVerified
      };
    })
  );

  res.json({
    customers: customersWithStats,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get a user's orders
 */
const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await Order.find({ user: req.params.id });
  if (!orders) {
    res.status(404);
    throw new Error('Orders not found for this user');
  }
  res.json(orders);
});

const getCustomerProfile = asyncHandler(async (req: Request, res: Response) => {
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
    const defaultAddress = user.addresses?.find((a: any) => a.isDefault) || user.addresses?.[0] || null;
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

/**
 * Bulk deactivate users (summary admin notification)
 */
const bulkDeactivateUsers = asyncHandler(async (req: Request, res: Response) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    res.status(400);
    throw new Error('User IDs must be provided as a non-empty array.');
  }

  const filter = { _id: { $in: userIds }, role: 'user' };
  const result = await User.updateMany(filter, { $set: { isDeactivated: true } });

  if (result.matchedCount === 0) {
    res.status(404);
    throw new Error('No matching customer accounts found for the provided IDs.');
  }

  // 🔔 enqueue ONE summary admin notification
  const actor = (req as any)?.user?.name || 'system';
  await enqueueAdminUserActivity({
    activityType: 'bulk_user_deactivated',
    userName: actor,
    userEmail: '',
    details: `${result.modifiedCount} customer account(s) deactivated by ${actor}`,
  });

  res.status(200).json({
    message: `${result.modifiedCount} customer(s) deactivated successfully.`,
    modifiedCount: result.modifiedCount,
  });
});

/**
 * Bulk reactivate users (summary admin notification)
 */
const bulkReactivateUsers = asyncHandler(async (req: Request, res: Response) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    res.status(400);
    throw new Error('User IDs must be provided as a non-empty array.');
  }

  const filter = { _id: { $in: userIds }, role: 'user' };
  const result = await User.updateMany(filter, { $set: { isDeactivated: false } });

  if (result.matchedCount === 0) {
    res.status(404);
    throw new Error('No matching customer accounts found for the provided IDs.');
  }

  // 🔔 enqueue ONE summary admin notification
  const actor = (req as any)?.user?.name || 'system';
  await enqueueAdminUserActivity({
    activityType: 'bulk_user_reactivated',
    userName: actor,
    userEmail: '',
    details: `${result.modifiedCount} customer account(s) reactivated by ${actor}`,
  });

  res.status(200).json({
    message: `${result.modifiedCount} customer(s) reactivated successfully.`,
    modifiedCount: result.modifiedCount,
  });
});

export {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserSettings,
  updateUserSettings,
  getAddresses,
  getCustomerProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  deactivateUser,
  reactivateUser,
  getCustomerAnalytics,
  sendEmailToCustomer,
  getAllCustomers,
  getUserOrders,
  bulkDeactivateUsers,
  bulkReactivateUsers,
};
