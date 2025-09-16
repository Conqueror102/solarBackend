"use strict";
// /**
//  * adminNotificationTest.ts - Admin Notification Test Script
//  * ---------------------
//  * This script demonstrates the admin notification system functionality.
//  * Run this script to test admin notification features.
//  */
// import { 
//     notifyNewUserRegistration,
//     notifyNewOrderPlaced,
//     notifyOrderStatusChanged,
//     notifyPaymentReceived,
//     notifyPaymentFailed,
//     notifyLowStockAlert,
//     notifyOutOfStockAlert,
//     notifyProductAdded,
//     notifyProductUpdated,
//     notifySystemAlert,
//     notifySecurityAlert,
//     notifyPerformanceAlert,
//     notifyRevenueMilestone,
//     notifyUserActivity,
//     notifyInventoryAlert,
//     getAdminNotificationStats
// } from './adminNotificationService.js';
// import { User } from '../models/User.js';
// import { Notification } from '../models/Notification.js';
// /**
//  * Test admin notification system functionality
//  */
// export const testAdminNotificationSystem = async () => {
//     try {
//         console.log('🧪 Testing Admin Notification System...\n');
//         // Check if admin users exist
//         const adminUsers = await User.find({ 
//             role: { $in: ['admin', 'superadmin'] },
//             isDeactivated: false 
//         });
//         if (adminUsers.length === 0) {
//             console.log('❌ No admin users found. Please create admin users first.');
//             console.log('💡 Create users with role "admin" or "superadmin" to test admin notifications.');
//             return;
//         }
//         console.log(`👥 Found ${adminUsers.length} admin users for testing`);
//         adminUsers.forEach(admin => {
//             console.log(`   - ${admin.name} (${admin.email}) - ${admin.role}`);
//         });
//         // Test 1: New user registration notification
//         console.log('\n📝 Test 1: New user registration notification...');
//         await notifyNewUserRegistration(
//             'user_123456',
//             'John Doe',
//             'john.doe@example.com'
//         );
//         console.log('✅ New user registration notification sent');
//         // Test 2: New order placed notification
//         console.log('\n📦 Test 2: New order placed notification...');
//         await notifyNewOrderPlaced(
//             'order_123456',
//             299.99,
//             'Jane Smith',
//             'jane.smith@example.com'
//         );
//         console.log('✅ New order notification sent');
//         // Test 3: Order status change notification
//         console.log('\n🔄 Test 3: Order status change notification...');
//         await notifyOrderStatusChanged(
//             'order_123456',
//             'pending',
//             'shipped',
//             299.99,
//             'Jane Smith'
//         );
//         console.log('✅ Order status change notification sent');
//         // Test 4: Payment received notification
//         console.log('\n💳 Test 4: Payment received notification...');
//         await notifyPaymentReceived(
//             'order_123456',
//             299.99,
//             'credit_card',
//             'Jane Smith'
//         );
//         console.log('✅ Payment received notification sent');
//         // Test 5: Payment failed notification
//         console.log('\n❌ Test 5: Payment failed notification...');
//         await notifyPaymentFailed(
//             'order_123456',
//             299.99,
//             'credit_card',
//             'Insufficient funds',
//             'Jane Smith'
//         );
//         console.log('✅ Payment failed notification sent');
//         // Test 6: Low stock alert notification
//         console.log('\n⚠️ Test 6: Low stock alert notification...');
//         await notifyLowStockAlert(
//             'product_123',
//             'Solar Panel 100W',
//             3,
//             5
//         );
//         console.log('✅ Low stock alert notification sent');
//         // Test 7: Out of stock alert notification
//         console.log('\n🚫 Test 7: Out of stock alert notification...');
//         await notifyOutOfStockAlert(
//             'product_123',
//             'Solar Panel 100W'
//         );
//         console.log('✅ Out of stock alert notification sent');
//         // Test 8: Product added notification
//         console.log('\n➕ Test 8: Product added notification...');
//         await notifyProductAdded(
//             'product_456',
//             'Solar Inverter 2000W',
//             'Admin User'
//         );
//         console.log('✅ Product added notification sent');
//         // Test 9: Product updated notification
//         console.log('\n✏️ Test 9: Product updated notification...');
//         await notifyProductUpdated(
//             'product_456',
//             'Solar Inverter 2000W',
//             'Admin User',
//             ['price', 'stock', 'description']
//         );
//         console.log('✅ Product updated notification sent');
//         // Test 10: System alert notification
//         console.log('\n🔧 Test 10: System alert notification...');
//         await notifySystemAlert(
//             'Database Maintenance',
//             'Scheduled database maintenance will occur tonight at 2:00 AM UTC.',
//             'high',
//             { maintenance: true, startTime: '2024-01-01T02:00:00Z' }
//         );
//         console.log('✅ System alert notification sent');
//         // Test 11: Security alert notification
//         console.log('\n🔒 Test 11: Security alert notification...');
//         await notifySecurityAlert(
//             'Failed Login Attempts',
//             'Multiple failed login attempts detected from IP 192.168.1.100',
//             { ipAddress: '192.168.1.100', attempts: 5, userEmail: 'admin@example.com' }
//         );
//         console.log('✅ Security alert notification sent');
//         // Test 12: Performance alert notification
//         console.log('\n⚡ Test 12: Performance alert notification...');
//         await notifyPerformanceAlert(
//             'Response Time',
//             2500,
//             2000,
//             'API response time is above threshold (2500ms > 2000ms)'
//         );
//         console.log('✅ Performance alert notification sent');
//         // Test 13: Revenue milestone notification
//         console.log('\n💰 Test 13: Revenue milestone notification...');
//         await notifyRevenueMilestone(
//             '$10,000 Monthly Revenue',
//             10000,
//             'January 2024'
//         );
//         console.log('✅ Revenue milestone notification sent');
//         // Test 14: User activity notification
//         console.log('\n👤 Test 14: User activity notification...');
//         await notifyUserActivity(
//             'Password Reset',
//             'John Doe',
//             'john.doe@example.com',
//             'User requested password reset'
//         );
//         console.log('✅ User activity notification sent');
//         // Test 15: Inventory alert notification
//         console.log('\n📦 Test 15: Inventory alert notification...');
//         await notifyInventoryAlert(
//             'Stock Depletion',
//             'Solar Panel 100W',
//             0,
//             'Product is completely out of stock and needs immediate restocking'
//         );
//         console.log('✅ Inventory alert notification sent');
//         // Test 16: Get admin notification statistics
//         console.log('\n📊 Test 16: Getting admin notification statistics...');
//         const stats = await getAdminNotificationStats();
//         console.log('✅ Admin notification statistics:');
//         console.log(`   Total notifications: ${stats.total}`);
//         console.log(`   Unread notifications: ${stats.unread}`);
//         console.log(`   By type:`, stats.byType);
//         console.log(`   By priority:`, stats.byPriority);
//         // Test 17: Display recent admin notifications
//         console.log('\n📋 Test 17: Displaying recent admin notifications...');
//         const adminUserIds = adminUsers.map(admin => admin._id);
//         const recentNotifications = await Notification.find({ 
//             recipient: { $in: adminUserIds },
//             isDeleted: false 
//         }).sort({ createdAt: -1 }).limit(10);
//         console.log(`✅ Found ${recentNotifications.length} recent admin notifications:`);
//         recentNotifications.forEach((notification, index) => {
//             const adminNotificationType = notification.data?.adminNotificationType || 'system';
//             console.log(`   ${index + 1}. [${adminNotificationType.toUpperCase()}] ${notification.title}`);
//             console.log(`      Message: ${notification.message}`);
//             console.log(`      Priority: ${notification.priority}, Read: ${notification.isRead}`);
//             console.log(`      Created: ${notification.createdAt}`);
//             console.log('');
//         });
//         console.log('🎉 All admin notification tests completed successfully!');
//         console.log('\n💡 Admin Notification Features:');
//         console.log('   ✅ New user registrations');
//         console.log('   ✅ New orders placed');
//         console.log('   ✅ Order status changes');
//         console.log('   ✅ Payment success/failure');
//         console.log('   ✅ Low stock alerts');
//         console.log('   ✅ Out of stock alerts');
//         console.log('   ✅ Product additions/updates');
//         console.log('   ✅ System alerts');
//         console.log('   ✅ Security alerts');
//         console.log('   ✅ Performance alerts');
//         console.log('   ✅ Revenue milestones');
//         console.log('   ✅ User activities');
//         console.log('   ✅ Inventory alerts');
//     } catch (error) {
//         console.error('❌ Error testing admin notification system:', error);
//     }
// };
// /**
//  * Clean up admin test notifications
//  */
// export const cleanupAdminTestNotifications = async () => {
//     try {
//         console.log('🧹 Cleaning up admin test notifications...');
//         // Delete notifications created in the last hour (for testing)
//         const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
//         const result = await Notification.deleteMany({
//             createdAt: { $gte: oneHourAgo },
//             title: { 
//                 $in: [
//                     'New User Registration',
//                     'New Order Placed',
//                     'Order Status Updated',
//                     'Payment Received',
//                     'Payment Failed',
//                     'Low Stock Alert',
//                     'Out of Stock Alert',
//                     'New Product Added',
//                     'Product Updated',
//                     'System Alert: Database Maintenance',
//                     'Security Alert: Failed Login Attempts',
//                     'Performance Alert: Response Time',
//                     'Revenue Milestone: $10,000 Monthly Revenue',
//                     'User Activity: Password Reset',
//                     'Inventory Alert: Stock Depletion'
//                 ]
//             }
//         });
//         console.log(`✅ Cleaned up ${result.deletedCount} admin test notifications`);
//     } catch (error) {
//         console.error('❌ Error cleaning up admin test notifications:', error);
//     }
// };
// // Export functions for manual testing
// export { testAdminNotificationSystem as runAdminNotificationTests }; 
