/**
 * adminNotificationService.ts - Admin Notification Service
 * ---------------------
 * Provides utility functions for creating admin-specific notifications
 * about system events, user activities, and business metrics.
 */
import { Notification, INotification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Brand } from '../models/Brand.js';

// Admin notification types
export type AdminNotificationType = 
  | 'new_user_registration'
  | 'new_order_placed'
  | 'order_status_changed'
  | 'payment_received'
  | 'payment_failed'
  | 'low_stock_alert'
  | 'out_of_stock_alert'
  | 'product_added'
  | 'product_updated'
  | 'brand_added'
  | 'brand_updated'
  | 'brand_deleted'
  | 'system_alert'
  | 'security_alert'
  | 'performance_alert'
  | 'revenue_milestone'
  | 'user_activity'
  | 'inventory_alert';

// Interface for admin notification data
export interface AdminNotificationData {
  userId?: string;
  userName?: string;
  userEmail?: string;
  orderId?: string;
  orderAmount?: number;
  productId?: string;
  productName?: string;
  brandId?: string;
  brandName?: string;
  stockLevel?: number;
  threshold?: number;
  revenue?: number;
  activityType?: string;
  changes?: string[];
  [key: string]: any;
}

/**
 * Get all admin users (admin and superadmin roles)
 */
const getAdminUsers = async (): Promise<string[]> => {
  try {
    const admins = await User.find({ 
      role: { $in: ['admin', 'superadmin'] },
      isDeactivated: false 
    });
    return admins.map(admin => admin._id.toString());
  } catch (error) {
    console.error('Error getting admin users:', error);
    return [];
  }
};

/**
 * Create admin notification
 */
export const createAdminNotification = async (
  type: AdminNotificationType,
  title: string,
  message: string,
  data?: AdminNotificationData,
  priority: INotification['priority'] = 'medium'
): Promise<INotification[]> => {
  try {
    const adminUserIds = await getAdminUsers();
    if (adminUserIds.length === 0) {
      console.log('No admin users found for notification');
      return [];
    }

    const notifications = adminUserIds.map(userId => ({
      recipient: userId,
      type: 'system' as INotification['type'],
      title,
      message,
      data: {
        adminNotificationType: type,
        ...data
      },
      priority,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }));

    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`Admin notification created for ${createdNotifications.length} admins: ${title}`);
    return createdNotifications;
  } catch (error) {
    console.error('Error creating admin notification:', error);
    return [];
  }
};

// Predefined admin notification functions

/**
 * New user registration notification
 */
export const notifyNewUserRegistration = async (
  userId: string,
  userName: string,
  userEmail: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'new_user_registration',
    'New User Registration',
    `New user registered: ${userName} (${userEmail})`,
    {
      userId,
      userName,
      userEmail
    },
    'medium'
  );
};

/**
 * New order placed notification
 */
export const notifyNewOrderPlaced = async (
  orderId: string,
  orderAmount: number,
  customerName: string,
  customerEmail: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'new_order_placed',
    'New Order Placed',
    `New order #${orderId.slice(-5)} placed by ${customerName} for $${orderAmount.toFixed(2)}`,
    {
      orderId,
      orderAmount,
      userName: customerName,
      userEmail: customerEmail
    },
    'high'
  );
};

/**
 * Order status change notification
 */
export const notifyOrderStatusChanged = async (
  orderId: string,
  oldStatus: string,
  newStatus: string,
  orderAmount: number,
  customerName: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'order_status_changed',
    'Order Status Updated',
    `Order #${orderId.slice(-5)} status changed from ${oldStatus} to ${newStatus}`,
    {
      orderId,
      orderAmount,
      userName: customerName,
      oldStatus,
      newStatus
    },
    'medium'
  );
};

/**
 * Payment received notification
 */
export const notifyPaymentReceived = async (
  orderId: string,
  amount: number,
  paymentMethod: string,
  customerName: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'payment_received',
    'Payment Received',
    `Payment of $${amount.toFixed(2)} received for order #${orderId.slice(-5)} via ${paymentMethod}`,
    {
      orderId,
      orderAmount: amount,
      userName: customerName,
      paymentMethod
    },
    'high'
  );
};

/**
 * Payment failed notification
 */
export const notifyPaymentFailed = async (
  orderId: string,
  amount: number,
  paymentMethod: string,
  reason: string,
  customerName: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'payment_failed',
    'Payment Failed',
    `Payment of $${amount.toFixed(2)} failed for order #${orderId.slice(-5)} via ${paymentMethod}. Reason: ${reason}`,
    {
      orderId,
      orderAmount: amount,
      userName: customerName,
      paymentMethod,
      reason
    },
    'urgent'
  );
};

/**
 * Low stock alert notification
 */
export const notifyLowStockAlert = async (
  productId: string,
  productName: string,
  currentStock: number,
  threshold: number
): Promise<INotification[]> => {
  return await createAdminNotification(
    'low_stock_alert',
    'Low Stock Alert',
    `${productName} is running low on stock. Current: ${currentStock}, Threshold: ${threshold}`,
    {
      productId,
      productName,
      stockLevel: currentStock,
      threshold
    },
    'high'
  );
};

/**
 * Out of stock alert notification
 */
export const notifyOutOfStockAlert = async (
  productId: string,
  productName: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'out_of_stock_alert',
    'Out of Stock Alert',
    `${productName} is now out of stock and needs restocking.`,
    {
      productId,
      productName,
      stockLevel: 0
    },
    'urgent'
  );
};

/**
 * Product added notification
 */
export const notifyProductAdded = async (
  productId: string,
  productName: string,
  addedBy: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'product_added',
    'New Product Added',
    `New product "${productName}" has been added to the catalog by ${addedBy}`,
    {
      productId,
      productName,
      addedBy
    },
    'medium'
  );
};

/**
 * Product updated notification
 */
export const notifyProductUpdated = async (
  productId: string,
  productName: string,
  updatedBy: string,
  changes: string[]
): Promise<INotification[]> => {
  return await createAdminNotification(
    'product_updated',
    'Product Updated',
    `Product "${productName}" has been updated by ${updatedBy}. Changes: ${changes.join(', ')}`,
    {
      productId,
      productName,
      updatedBy,
      changes
    },
    'medium'
  );
};

/**
 * System alert notification
 */
export const notifySystemAlert = async (
  alertType: string,
  message: string,
  severity: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  data?: AdminNotificationData
): Promise<INotification[]> => {
  return await createAdminNotification(
    'system_alert',
    `System Alert: ${alertType}`,
    message,
    {
      alertType,
      ...data
    },
    severity
  );
};

/**
 * Security alert notification
 */
export const notifySecurityAlert = async (
  alertType: string,
  message: string,
  data?: AdminNotificationData
): Promise<INotification[]> => {
  return await createAdminNotification(
    'security_alert',
    `Security Alert: ${alertType}`,
    message,
    {
      alertType,
      ...data
    },
    'urgent'
  );
};

/**
 * Performance alert notification
 */
export const notifyPerformanceAlert = async (
  metric: string,
  value: number,
  threshold: number,
  message: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'performance_alert',
    `Performance Alert: ${metric}`,
    message,
    {
      metric,
      value,
      threshold
    },
    'high'
  );
};

/**
 * Revenue milestone notification
 */
export const notifyRevenueMilestone = async (
  milestone: string,
  amount: number,
  period: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'revenue_milestone',
    `Revenue Milestone: ${milestone}`,
    `Congratulations! You've reached ${milestone} with $${amount.toFixed(2)} in ${period}`,
    {
      milestone,
      revenue: amount,
      period
    },
    'high'
  );
};

/**
 * User activity notification
 */
export const notifyUserActivity = async (
  activityType: string,
  userName: string,
  userEmail: string,
  details: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'user_activity',
    `User Activity: ${activityType}`,
    `${userName} (${userEmail}) - ${details}`,
    {
      userName,
      userEmail,
      activityType,
      details
    },
    'medium'
  );
};

/**
 * Inventory alert notification
 */
export const notifyInventoryAlert = async (
  alertType: string,
  productName: string,
  currentStock: number,
  message: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'inventory_alert',
    `Inventory Alert: ${alertType}`,
    message,
    {
      productName,
      stockLevel: currentStock,
      alertType
    },
    'high'
  );
};

/**
 * Brand added notification
 */
export const notifyBrandAdded = async (
  brandId: string,
  brandName: string,
  addedBy?: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'brand_added',
    'New Brand Added',
    `New brand "${brandName}" has been added to the system${addedBy ? ` by ${addedBy}` : ''}`,
    {
      brandId,
      brandName,
      addedBy: addedBy || 'System'
    },
    'medium'
  );
};

/**
 * Brand updated notification
 */
export const notifyBrandUpdated = async (
  brandId: string,
  oldBrandName: string,
  newBrandName: string,
  updatedBy?: string,
  changes?: string[]
): Promise<INotification[]> => {
  const changeMessage = changes && changes.length > 0 
    ? `. Changes: ${changes.join(', ')}` 
    : '';
  
  return await createAdminNotification(
    'brand_updated',
    'Brand Updated',
    `Brand "${oldBrandName}" has been updated${newBrandName !== oldBrandName ? ` to "${newBrandName}"` : ''}${updatedBy ? ` by ${updatedBy}` : ''}${changeMessage}`,
    {
      brandId,
      brandName: newBrandName,
      oldBrandName,
      updatedBy: updatedBy || 'System',
      changes: changes || []
    },
    'medium'
  );
};

/**
 * Brand deleted notification
 */
export const notifyBrandDeleted = async (
  brandId: string,
  brandName: string,
  deletedBy?: string
): Promise<INotification[]> => {
  return await createAdminNotification(
    'brand_deleted',
    'Brand Deleted',
    `Brand "${brandName}" has been deleted from the system${deletedBy ? ` by ${deletedBy}` : ''}`,
    {
      brandId,
      brandName,
      deletedBy: deletedBy || 'System'
    },
    'high'
  );
};

/**
 * Get admin notification statistics
 */
export const getAdminNotificationStats = async (): Promise<{
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}> => {
  try {
    const adminUserIds = await getAdminUsers();
    if (adminUserIds.length === 0) {
      return { total: 0, unread: 0, byType: {}, byPriority: {} };
    }

    const [total, unread] = await Promise.all([
      Notification.countDocuments({ 
        recipient: { $in: adminUserIds },
        isDeleted: false 
      }),
      Notification.countDocuments({ 
        recipient: { $in: adminUserIds },
        isRead: false,
        isDeleted: false 
      })
    ]);

    // Get counts by admin notification type
    const typeStats = await Notification.aggregate([
      { 
        $match: { 
          recipient: { $in: adminUserIds.map(id => new (require('mongoose').Types.ObjectId)(id)) },
          isDeleted: false 
        } 
      },
      { $group: { _id: '$data.adminNotificationType', count: { $sum: 1 } } }
    ]);

    // Get counts by priority
    const priorityStats = await Notification.aggregate([
      { 
        $match: { 
          recipient: { $in: adminUserIds.map(id => new (require('mongoose').Types.ObjectId)(id)) },
          isDeleted: false 
        } 
      },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    return {
      total,
      unread,
      byType: typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byPriority: priorityStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting admin notification stats:', error);
    return { total: 0, unread: 0, byType: {}, byPriority: {} };
  }
}; 