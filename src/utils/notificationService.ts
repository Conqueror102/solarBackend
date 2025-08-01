/**
 * notificationService.ts - Notification Service
 * ---------------------
 * Provides utility functions for creating different types of notifications
 * throughout the application.
 */
import { Notification, INotification } from '../models/Notification.js';
import { User } from '../models/User.js';

// Notification type definitions
export type NotificationType = INotification['type'];
export type NotificationPriority = INotification['priority'];

// Interface for notification data
export interface NotificationData {
    orderId?: string;
    productId?: string;
    amount?: number;
    paymentMethod?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    [key: string]: any;
}

/**
 * Create a notification for a single user
 */
export const createNotification = async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: NotificationData,
    priority: NotificationPriority = 'medium',
    expiresAt?: Date
): Promise<INotification | null> => {
    try {
        const notification = await Notification.create({
            recipient: userId,
            type,
            title,
            message,
            data: data || {},
            priority,
            expiresAt
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

/**
 * Create notifications for multiple users
 */
export const createBulkNotifications = async (
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: NotificationData,
    priority: NotificationPriority = 'medium',
    expiresAt?: Date
): Promise<INotification[]> => {
    try {
        const notifications = userIds.map(userId => ({
            recipient: userId,
            type,
            title,
            message,
            data: data || {},
            priority,
            expiresAt
        }));
        
        const createdNotifications = await Notification.insertMany(notifications);
        return createdNotifications;
    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        return [];
    }
};

/**
 * Create notification for all users with a specific role
 */
export const createNotificationForRole = async (
    role: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: NotificationData,
    priority: NotificationPriority = 'medium',
    expiresAt?: Date
): Promise<INotification[]> => {
    try {
        const users = await User.find({ role, isDeactivated: false });
        const userIds = users.map(user => user._id.toString());
        
        if (userIds.length === 0) {
            return [];
        }
        
        return await createBulkNotifications(userIds, type, title, message, data, priority, expiresAt);
    } catch (error) {
        console.error('Error creating notifications for role:', error);
        return [];
    }
};

/**
 * Create notification for all active users
 */
export const createNotificationForAllUsers = async (
    type: NotificationType,
    title: string,
    message: string,
    data?: NotificationData,
    priority: NotificationPriority = 'medium',
    expiresAt?: Date
): Promise<INotification[]> => {
    try {
        const users = await User.find({ isDeactivated: false });
        const userIds = users.map(user => user._id.toString());
        
        if (userIds.length === 0) {
            return [];
        }
        
        return await createBulkNotifications(userIds, type, title, message, data, priority, expiresAt);
    } catch (error) {
        console.error('Error creating notifications for all users:', error);
        return [];
    }
};

// Predefined notification functions for common scenarios

/**
 * Create order status notification
 */
export const createOrderStatusNotification = async (
    userId: string,
    orderId: string,
    status: string,
    additionalData?: NotificationData
): Promise<INotification | null> => {
    const titles = {
        'pending': 'Order Confirmed',
        'processing': 'Order Processing',
        'shipped': 'Order Shipped',
        'delivered': 'Order Delivered',
        'cancelled': 'Order Cancelled',
        'refunded': 'Order Refunded'
    };
    
    const messages = {
        'pending': 'Your order has been confirmed and is being prepared.',
        'processing': 'Your order is being processed and will be shipped soon.',
        'shipped': 'Your order has been shipped and is on its way to you.',
        'delivered': 'Your order has been delivered successfully.',
        'cancelled': 'Your order has been cancelled as requested.',
        'refunded': 'Your order has been refunded successfully.'
    };
    
    const title = titles[status as keyof typeof titles] || 'Order Status Update';
    const message = messages[status as keyof typeof messages] || `Your order status has been updated to: ${status}`;
    
    return await createNotification(
        userId,
        'order_status',
        title,
        message,
        {
            orderId,
            status,
            ...additionalData
        },
        'medium'
    );
};

/**
 * Create payment success notification
 */
export const createPaymentSuccessNotification = async (
    userId: string,
    orderId: string,
    amount: number,
    paymentMethod: string
): Promise<INotification | null> => {
    return await createNotification(
        userId,
        'payment_success',
        'Payment Successful',
        `Your payment of $${amount.toFixed(2)} has been processed successfully using ${paymentMethod}.`,
        {
            orderId,
            amount,
            paymentMethod
        },
        'high'
    );
};

/**
 * Create payment failed notification
 */
export const createPaymentFailedNotification = async (
    userId: string,
    orderId: string,
    amount: number,
    paymentMethod: string,
    reason?: string
): Promise<INotification | null> => {
    return await createNotification(
        userId,
        'payment_failed',
        'Payment Failed',
        `Your payment of $${amount.toFixed(2)} using ${paymentMethod} has failed.${reason ? ` Reason: ${reason}` : ''}`,
        {
            orderId,
            amount,
            paymentMethod,
            reason
        },
        'urgent'
    );
};

/**
 * Create product restock notification
 */
export const createProductRestockNotification = async (
    userId: string,
    productId: string,
    productName: string
): Promise<INotification | null> => {
    return await createNotification(
        userId,
        'product_restock',
        'Product Back in Stock',
        `${productName} is now back in stock and available for purchase.`,
        {
            productId,
            productName
        },
        'medium'
    );
};

/**
 * Create promotion notification
 */
export const createPromotionNotification = async (
    userId: string,
    title: string,
    message: string,
    data?: NotificationData
): Promise<INotification | null> => {
    return await createNotification(
        userId,
        'promotion',
        title,
        message,
        data,
        'medium'
    );
};

/**
 * Create system notification
 */
export const createSystemNotification = async (
    userId: string,
    title: string,
    message: string,
    data?: NotificationData,
    priority: NotificationPriority = 'medium'
): Promise<INotification | null> => {
    return await createNotification(
        userId,
        'system',
        title,
        message,
        data,
        priority
    );
};

/**
 * Create email verification notification
 */
export const createEmailVerificationNotification = async (
    userId: string,
    verificationToken: string
): Promise<INotification | null> => {
    return await createNotification(
        userId,
        'email_verification',
        'Email Verification Required',
        'Please verify your email address to complete your account setup.',
        {
            verificationToken
        },
        'high'
    );
};

/**
 * Create password reset notification
 */
export const createPasswordResetNotification = async (
    userId: string,
    resetToken: string
): Promise<INotification | null> => {
    return await createNotification(
        userId,
        'password_reset',
        'Password Reset Request',
        'A password reset has been requested for your account.',
        {
            resetToken
        },
        'high'
    );
};

/**
 * Get unread notification count for a user
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
    try {
        return await Notification.countDocuments({
            recipient: userId,
            isRead: false,
            isDeleted: false
        });
    } catch (error) {
        console.error('Error getting unread notification count:', error);
        return 0;
    }
};

/**
 * Delete expired notifications
 */
export const deleteExpiredNotifications = async (): Promise<number> => {
    try {
        const result = await Notification.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        return result.deletedCount || 0;
    } catch (error) {
        console.error('Error deleting expired notifications:', error);
        return 0;
    }
}; 