/**
 * notificationTest.ts - Notification System Test Script
 * ---------------------
 * This script demonstrates how to use the notification system.
 * Run this script to test notification functionality.
 */
import { createOrderStatusNotification, createPaymentSuccessNotification, createProductRestockNotification, createPromotionNotification, createSystemNotification, createNotificationForAllUsers, createNotificationForRole, getUnreadNotificationCount } from './notificationService.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
/**
 * Test notification system functionality
 */
export const testNotificationSystem = async () => {
    try {
        console.log('🧪 Testing Notification System...\n');
        // Get a test user (first user in the system)
        const testUser = await User.findOne({ role: 'user' });
        if (!testUser) {
            console.log('❌ No test user found. Please create a user first.');
            return;
        }
        const userId = testUser._id.toString();
        console.log(`👤 Using test user: ${testUser.name} (${testUser.email})`);
        // Test 1: Create a simple system notification
        console.log('\n📝 Test 1: Creating system notification...');
        const systemNotification = await createSystemNotification(userId, 'Welcome to Solar!', 'Thank you for joining our platform. We hope you enjoy your shopping experience.', { welcome: true });
        console.log(`✅ System notification created: ${systemNotification?._id}`);
        // Test 2: Create order status notification
        console.log('\n📦 Test 2: Creating order status notification...');
        const orderNotification = await createOrderStatusNotification(userId, 'order_123456', 'shipped', {
            trackingNumber: 'TRK123456789',
            estimatedDelivery: '2024-01-15'
        });
        console.log(`✅ Order notification created: ${orderNotification?._id}`);
        // Test 3: Create payment success notification
        console.log('\n💳 Test 3: Creating payment success notification...');
        const paymentNotification = await createPaymentSuccessNotification(userId, 'order_123456', 99.99, 'credit_card');
        console.log(`✅ Payment notification created: ${paymentNotification?._id}`);
        // Test 4: Create product restock notification
        console.log('\n📦 Test 4: Creating product restock notification...');
        const restockNotification = await createProductRestockNotification(userId, 'product_123', 'Solar Panel 100W');
        console.log(`✅ Restock notification created: ${restockNotification?._id}`);
        // Test 5: Create promotion notification
        console.log('\n🎉 Test 5: Creating promotion notification...');
        const promotionNotification = await createPromotionNotification(userId, 'Holiday Sale!', 'Get up to 50% off on all solar products this holiday season.', { saleId: 'holiday2024', discount: 50 });
        console.log(`✅ Promotion notification created: ${promotionNotification?._id}`);
        // Test 6: Get unread notification count
        console.log('\n📊 Test 6: Getting unread notification count...');
        const unreadCount = await getUnreadNotificationCount(userId);
        console.log(`✅ Unread notifications: ${unreadCount}`);
        // Test 7: Create notification for all users (admin only)
        console.log('\n👥 Test 7: Creating notification for all users...');
        const allUsersNotification = await createNotificationForAllUsers('system', 'System Maintenance', 'Our platform will be under maintenance from 2:00 AM to 4:00 AM UTC.', { maintenance: true, startTime: '2024-01-01T02:00:00Z', endTime: '2024-01-01T04:00:00Z' }, 'high');
        console.log(`✅ Notifications created for all users: ${allUsersNotification.length}`);
        // Test 8: Create notification for specific role
        console.log('\n👨‍💼 Test 8: Creating notification for admin role...');
        const adminNotification = await createNotificationForRole('admin', 'system', 'Admin Alert', 'New user registration requires approval.', { alert: true, type: 'user_registration' }, 'high');
        console.log(`✅ Admin notifications created: ${adminNotification.length}`);
        // Test 9: Display all notifications for the test user
        console.log('\n📋 Test 9: Displaying all notifications for test user...');
        const userNotifications = await Notification.find({
            recipient: userId,
            isDeleted: false
        }).sort({ createdAt: -1 }).limit(10);
        console.log(`✅ Found ${userNotifications.length} notifications:`);
        userNotifications.forEach((notification, index) => {
            console.log(`   ${index + 1}. [${notification.type.toUpperCase()}] ${notification.title}`);
            console.log(`      Message: ${notification.message}`);
            console.log(`      Priority: ${notification.priority}, Read: ${notification.isRead}`);
            console.log(`      Created: ${notification.createdAt}`);
            console.log('');
        });
        console.log('🎉 All notification tests completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Test the API endpoints using Postman or curl');
        console.log('   2. Integrate notifications into your frontend');
        console.log('   3. Set up real-time notifications using WebSockets');
        console.log('   4. Configure notification preferences for users');
    }
    catch (error) {
        console.error('❌ Error testing notification system:', error);
    }
};
/**
 * Clean up test notifications
 */
export const cleanupTestNotifications = async () => {
    try {
        console.log('🧹 Cleaning up test notifications...');
        // Delete notifications created in the last hour (for testing)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const result = await Notification.deleteMany({
            createdAt: { $gte: oneHourAgo },
            title: {
                $in: [
                    'Welcome to Solar!',
                    'Order Shipped',
                    'Payment Successful',
                    'Product Back in Stock',
                    'Holiday Sale!',
                    'System Maintenance',
                    'Admin Alert'
                ]
            }
        });
        console.log(`✅ Cleaned up ${result.deletedCount} test notifications`);
    }
    catch (error) {
        console.error('❌ Error cleaning up test notifications:', error);
    }
};
// Export functions for manual testing
export { testNotificationSystem as runNotificationTests };
