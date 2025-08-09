/**
 * notificationController.ts - Notification Controller
 * ---------------------
 * Handles all notification-related operations including CRUD, read/unread status,
 * and utility functions for creating notifications.
 */
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { Notification, INotification } from '../models/Notification.js';
import { User } from '../models/User.js';

// @desc    Get all notifications for the authenticated user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const userId = (req as any).user._id;
    const { read, type, priority } = req.query;
    
    const filter: any = {
        recipient: userId,
        isDeleted: false
    };
    
    if (read !== undefined) {
        filter.isRead = read === 'true';
    }
    
    if (type) {
        filter.type = type;
    }
    
    if (priority) {
        filter.priority = priority;
    }
    
    const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('recipient', 'name email');
    
    const total = await Notification.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
        notifications,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    });
});

// @desc    Get a single notification by ID
// @route   GET /api/notifications/:id
// @access  Private
const getNotificationById = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipient: userId,
        isDeleted: false
    }).populate('recipient', 'name email');
    
    if (notification) {
        res.json(notification);
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipient: userId,
        isDeleted: false
    });
    
    if (notification) {
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
        res.json({ message: 'Notification marked as read', notification });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Mark notification as unread
// @route   PATCH /api/notifications/:id/unread
// @access  Private
const markAsUnread = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipient: userId,
        isDeleted: false
    });
    
    if (notification) {
        notification.isRead = false;
        notification.readAt = undefined;
        await notification.save();
        res.json({ message: 'Notification marked as unread', notification });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const { type } = req.query;
    
    const filter: any = {
        recipient: userId,
        isRead: false,
        isDeleted: false
    };
    
    if (type) {
        filter.type = type;
    }
    
    const result = await Notification.updateMany(filter, {
        isRead: true,
        readAt: new Date()
    });
    
    res.json({ 
        message: `${result.modifiedCount} notifications marked as read`,
        modifiedCount: result.modifiedCount
    });
});

// @desc    Delete a notification (soft delete)
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const notification = await Notification.findOne({
        _id: req.params.id,
        recipient: userId,
        isDeleted: false
    });
    
    if (notification) {
        notification.isDeleted = true;
        await notification.save();
        res.json({ message: 'Notification deleted' });
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
const getNotificationStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    
    const [total, unread, read] = await Promise.all([
        Notification.countDocuments({ recipient: userId, isDeleted: false }),
        Notification.countDocuments({ recipient: userId, isRead: false, isDeleted: false }),
        Notification.countDocuments({ recipient: userId, isRead: true, isDeleted: false })
    ]);
    
    // Get counts by type
    const typeStats = await Notification.aggregate([
        { $match: { recipient: userId, isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    // Get counts by priority
    const priorityStats = await Notification.aggregate([
        { $match: { recipient: userId, isDeleted: false } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    res.json({
        total,
        unread,
        read,
        typeStats: typeStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {}),
        priorityStats: priorityStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {})
    });
});

// @desc    Create a notification (admin only)
// @route   POST /api/notifications
// @access  Private (Admin/Superadmin)
const createNotification = asyncHandler(async (req: Request, res: Response) => {
    const { recipientId, type, title, message, data, priority, expiresAt } = req.body;
    
    // Validate required fields
    if (!recipientId || !type || !title || !message) {
        res.status(400);
        throw new Error('Recipient ID, type, title, and message are required');
    }
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
        res.status(404);
        throw new Error('Recipient not found');
    }
    
    const notification = await Notification.create({
        recipient: recipientId,
        type,
        title,
        message,
        data: data || {},
        priority: priority || 'medium',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });
    
    res.status(201).json(notification);
});

// @desc    Create notification for multiple users (admin only)
// @route   POST /api/notifications/bulk
// @access  Private (Admin/Superadmin)
const createBulkNotifications = asyncHandler(async (req: Request, res: Response) => {
    const { userIds, type, title, message, data, priority, expiresAt } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400);
        throw new Error('User IDs array is required');
    }
    
    if (!type || !title || !message) {
        res.status(400);
        throw new Error('Type, title, and message are required');
    }
    
    // Check if all users exist
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
        res.status(400);
        throw new Error('Some users not found');
    }
    
    const notifications = userIds.map(userId => ({
        recipient: userId,
        type,
        title,
        message,
        data: data || {},
        priority: priority || 'medium',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
    }));
    
    const createdNotifications = await Notification.insertMany(notifications);
    
    res.status(201).json({
        message: `${createdNotifications.length} notifications created`,
        count: createdNotifications.length,
        notifications: createdNotifications
    });
});

// Utility function to create notifications (can be used by other controllers)
export const createNotificationForUser = async (
    userId: string,
    type: INotification['type'],
    title: string,
    message: string,
    data?: Record<string, any>,
    priority?: INotification['priority'],
    expiresAt?: Date
) => {
    try {
        const notification = await Notification.create({
            recipient: userId,
            type,
            title,
            message,
            data: data || {},
            priority: priority || 'medium',
            expiresAt
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

// Utility function to create notifications for multiple users
// export const createNotificationsForUsers = async (
//     userIds: string[],
//     type: INotification['type'],
//     title: string,
//     message: string,
//     data?: Record<string, any>,
//     priority?: INotification['priority'],
//     expiresAt?: Date
// ) => {
//     try {
//         const notifications = userIds.map(userId => ({
//             recipient: userId,
//             type,
//             title,
//             message,
//             data: data || {},
//             priority: priority || 'medium',
//             expiresAt
//         }));
        
//         const createdNotifications = await Notification.insertMany(notifications);
//         return createdNotifications;
//     } catch (error) {
//         console.error('Error creating bulk notifications:', error);
//         return [];
//     }
// };

export {
    getNotifications,
    getNotificationById,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    getNotificationStats,
    createNotification,
    createBulkNotifications
};
