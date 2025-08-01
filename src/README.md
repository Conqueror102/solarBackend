

# Solar Backend - Notification System

This document describes the notification system implementation for the Solar E-commerce Backend.

## Overview

The notification system provides a comprehensive way to send and manage notifications for users. It supports different types of notifications, priority levels, and includes features like read/unread status, expiration dates, and bulk operations.

## Features

- **Multiple Notification Types**: Order status, payment success/failure, product restock, promotions, system notifications, email verification, and password reset
- **Admin Notifications**: Comprehensive admin notification system for system events, user activities, and business metrics
- **Priority Levels**: Low, medium, high, and urgent
- **Read/Unread Status**: Track notification read status with timestamps
- **Expiration Dates**: Automatic cleanup of expired notifications
- **Bulk Operations**: Send notifications to multiple users or all users
- **Role-based Targeting**: Send notifications to users with specific roles
- **Pagination**: Efficient pagination for large notification lists
- **Statistics**: Get notification statistics and counts
- **Soft Delete**: Notifications are soft deleted to maintain data integrity

## Database Schema

### Notification Model

```typescript
interface INotification {
  recipient: mongoose.Types.ObjectId;  // Reference to User
  type: 'order_status' | 'payment_success' | 'payment_failed' | 'product_restock' | 'promotion' | 'system' | 'email_verification' | 'password_reset';
  title: string;                       // Notification title (max 200 chars)
  message: string;                     // Notification message (max 1000 chars)
  data?: Record<string, any>;          // Additional data
  isRead: boolean;                     // Read status
  isDeleted: boolean;                  // Soft delete flag
  readAt?: Date;                       // When notification was read
  expiresAt?: Date;                    // Expiration date
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt?: Date;
  updatedAt?: Date;
}
```

## API Endpoints

### User Endpoints (Authenticated)

#### Get Notifications
```
GET /api/notifications
Query Parameters:
- page (number): Page number (default: 1)
- limit (number): Items per page (default: 20)
- read (boolean): Filter by read status
- type (string): Filter by notification type
- priority (string): Filter by priority level
```

#### Get Notification by ID
```
GET /api/notifications/:id
```

#### Mark Notification as Read
```
PATCH /api/notifications/:id/read
```

#### Mark Notification as Unread
```
PATCH /api/notifications/:id/unread
```

#### Mark All Notifications as Read
```
PATCH /api/notifications/read-all
Query Parameters:
- type (string): Optional filter by type
```

#### Delete Notification
```
DELETE /api/notifications/:id
```

#### Get Notification Statistics
```
GET /api/notifications/stats
```

### Admin Endpoints (Admin/Superadmin)

#### Create Single Notification
```
POST /api/notifications
Body:
{
  "recipientId": "user_id",
  "type": "system",
  "title": "Notification Title",
  "message": "Notification message",
  "data": {},
  "priority": "medium",
  "expiresAt": "2024-01-01T00:00:00.000Z"
}
```

#### Create Bulk Notifications
```
POST /api/notifications/bulk
Body:
{
  "userIds": ["user_id_1", "user_id_2"],
  "type": "promotion",
  "title": "Special Offer",
  "message": "Get 20% off on all products!",
  "data": {},
  "priority": "high",
  "expiresAt": "2024-01-01T00:00:00.000Z"
}
```

## Notification Service

The notification service provides utility functions for creating notifications throughout the application:

### Basic Functions

```typescript
// Create notification for single user
createNotification(userId, type, title, message, data?, priority?, expiresAt?)

// Create notifications for multiple users
createBulkNotifications(userIds, type, title, message, data?, priority?, expiresAt?)

// Create notifications for all users with specific role
createNotificationForRole(role, type, title, message, data?, priority?, expiresAt?)

// Create notifications for all active users
createNotificationForAllUsers(type, title, message, data?, priority?, expiresAt?)
```

### Predefined Functions

```typescript
// Order status notifications
createOrderStatusNotification(userId, orderId, status, additionalData?)

// Payment notifications
createPaymentSuccessNotification(userId, orderId, amount, paymentMethod)
createPaymentFailedNotification(userId, orderId, amount, paymentMethod, reason?)

// Product notifications
createProductRestockNotification(userId, productId, productName)

// System notifications
createSystemNotification(userId, title, message, data?, priority?)
createPromotionNotification(userId, title, message, data?)

// Account notifications
createEmailVerificationNotification(userId, verificationToken)
createPasswordResetNotification(userId, resetToken)
```

## Integration Examples

### Order Controller Integration

```typescript
import { createOrderStatusNotification, createPaymentSuccessNotification } from '../utils/notificationService.js';

// In order status update
await createOrderStatusNotification(userId, orderId, 'shipped', {
  trackingNumber: 'TRK123456',
  estimatedDelivery: '2024-01-15'
});

// In payment success
await createPaymentSuccessNotification(userId, orderId, 99.99, 'credit_card');
```

### Admin Notification Integration

```typescript
import { 
  notifyNewUserRegistration,
  notifyNewOrderPlaced,
  notifyLowStockAlert,
  notifySystemAlert 
} from '../utils/adminNotificationService.js';

// New user registration
await notifyNewUserRegistration(userId, userName, userEmail);

// New order placed
await notifyNewOrderPlaced(orderId, amount, customerName, customerEmail);

// Low stock alert
await notifyLowStockAlert(productId, productName, currentStock, threshold);

// System alert
await notifySystemAlert('Database Maintenance', 'Scheduled maintenance tonight', 'high');
```

### Product Controller Integration

```typescript
import { createProductRestockNotification } from '../utils/notificationService.js';

// When product comes back in stock
await createProductRestockNotification(userId, productId, productName);
```

## Cron Jobs

### Notification Cleanup
- **Schedule**: Daily at 2:00 AM UTC
- **Purpose**: Removes expired notifications
- **Function**: `deleteExpiredNotifications()`

## Usage Examples

### Creating a Simple Notification

```typescript
import { createNotification } from '../utils/notificationService.js';

await createNotification(
  userId,
  'system',
  'Welcome to Solar!',
  'Thank you for joining our platform.',
  { welcome: true },
  'medium'
);
```

### Creating Admin Notifications

```typescript
import { notifyNewUserRegistration, notifySystemAlert } from '../utils/adminNotificationService.js';

// Notify admins about new user
await notifyNewUserRegistration(userId, userName, userEmail);

// Notify admins about system event
await notifySystemAlert('Security Alert', 'Multiple failed login attempts', 'urgent');
```

### Creating Order Status Notification

```typescript
import { createOrderStatusNotification } from '../utils/notificationService.js';

await createOrderStatusNotification(
  userId,
  orderId,
  'shipped',
  {
    trackingNumber: 'TRK123456',
    estimatedDelivery: '2024-01-15'
  }
);
```

### Creating Bulk Promotional Notification

```typescript
import { createNotificationForAllUsers } from '../utils/notificationService.js';

await createNotificationForAllUsers(
  'promotion',
  'Holiday Sale!',
  'Get up to 50% off on selected items.',
  { saleId: 'holiday2024' },
  'high',
  new Date('2024-12-31')
);
```

## Frontend Integration

### Get User Notifications
```javascript
const response = await fetch('/api/notifications?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { notifications, pagination } = await response.json();
```

### Mark as Read
```javascript
await fetch(`/api/notifications/${notificationId}/read`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Get Unread Count
```javascript
const response = await fetch('/api/notifications/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { unread } = await response.json();
```

## Best Practices

1. **Use Appropriate Priority Levels**:
   - `urgent`: Payment failures, security alerts
   - `high`: Order updates, account verification
   - `medium`: Promotions, product updates
   - `low`: General announcements

2. **Set Expiration Dates**: Use expiration dates for time-sensitive notifications

3. **Include Relevant Data**: Add contextual data to notifications for better user experience

4. **Handle Errors Gracefully**: Always wrap notification creation in try-catch blocks

5. **Use Bulk Operations**: For mass notifications, use bulk operations for better performance

## Error Handling

The notification system includes comprehensive error handling:

- Database connection errors
- Invalid user IDs
- Missing required fields
- Expired tokens
- Permission errors

All errors are logged and handled gracefully to prevent system crashes.

## Performance Considerations

- Indexes are created on frequently queried fields
- Pagination is implemented for large datasets
- Soft deletes maintain data integrity
- Expired notifications are automatically cleaned up
- Bulk operations are optimized for performance

## Security

- All endpoints require authentication
- Admin endpoints require admin/superadmin role
- Users can only access their own notifications
- Input validation prevents injection attacks
- Rate limiting prevents abuse
Here's a comprehensive list of all notifications that admins and users can see in the system:
📋 Complete Notification List
👤 User Notifications (What regular users see)
Order-Related Notifications
Order Status Updates (order_status)
Order Confirmed
Order Processing
Order Shipped
Order Delivered
Order Cancelled
Order Refunded
Payment Notifications
Payment Success (payment_success) - "Your payment of $99.99 has been processed successfully"
Payment Failed (payment_failed) - "Your payment failed. Reason: Insufficient funds"
Product Notifications
Product Restock (product_restock) - "Solar Panel 100W is now back in stock"
Account Notifications
Email Verification (email_verification) - "Please verify your email address"
Password Reset (password_reset) - "A password reset has been requested"
Promotional Notifications
Promotions (promotion) - "Get 20% off on all products!"
System Notifications
System (system) - General system announcements
👨‍💼 Admin Notifications (What admins see)
User Management Notifications
New User Registration (new_user_registration)
"New user registered: John Doe (john@example.com)"
User Activity (user_activity)
Password reset requests
Login attempts
Profile updates
Order Management Notifications
New Order Placed (new_order_placed)
"New order #12345 placed by Jane Smith for $299.99"
Order Status Changed (order_status_changed)
"Order #12345 status changed from pending to shipped"
Payment Received (payment_received)
"Payment of $299.99 received for order #12345 via credit_card"
Payment Failed (payment_failed)
"Payment of $299.99 failed for order #12345. Reason: Insufficient funds"
Inventory Management Notifications
Low Stock Alert (low_stock_alert)
"Solar Panel 100W is running low on stock. Current: 3, Threshold: 5"
Out of Stock Alert (out_of_stock_alert)
"Solar Panel 100W is now out of stock and needs restocking"
Product Added (product_added)
"New product 'Solar Inverter 2000W' has been added by Admin User"
Product Updated (product_updated)
"Product 'Solar Inverter 2000W' has been updated. Changes: price, stock, description"
System & Security Notifications
System Alert (system_alert)
Database maintenance
System updates
General system announcements
Security Alert (security_alert)
Failed login attempts
Suspicious activity
Security breaches
Performance Alert (performance_alert)
API response time issues
Server performance problems
Database performance alerts
Business Metrics Notifications
Revenue Milestone (revenue_milestone)
"$10,000 Monthly Revenue achieved in January 2024"
Inventory Alert (inventory_alert)
Stock depletion warnings
Inventory management alerts
📊 Notification Priority Levels
For Users:
Medium: Order status updates, promotions, product restock
High: Payment success/failure, email verification, password reset
For Admins:
Low: User activity, product updates
Medium: New user registration, order status changes, system alerts
High: New orders, payment received, low stock alerts, performance alerts, revenue milestones
Urgent: Payment failures, out of stock alerts, security alerts
🔍 How to View Notifications
For Users:
For Admins:
📈 Notification Statistics
User Statistics:
Total notifications
Unread count
By type (order_status, payment_success, etc.)
By priority (low, medium, high, urgent)
Admin Statistics:
Total admin notifications
Unread admin notifications
By admin notification type (new_user_registration, low_stock_alert, etc.)
By priority
🎯 Key Differences
Aspect	User Notifications	Admin Notifications
Focus	Personal orders & account	System-wide events
Types	7 notification types	15 notification types
Priority	Mostly medium/high	All priority levels
Scope	Individual user	All users + system
Purpose	User experience	Business monitoring
This comprehensive notification system ensures that:
Users stay informed about their orders, payments, and account activities
Admins have complete visibility into system events, user activities, and business metrics