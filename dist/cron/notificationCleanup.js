/**
 * notificationCleanup.ts - Notification Cleanup Cron Job
 * ---------------------
 * Handles automatic cleanup of expired notifications and maintenance tasks.
 */
import cron from 'node-cron';
import { deleteExpiredNotifications } from '../utils/notificationService.js';
/**
 * Clean up expired notifications
 * Runs every day at 2:00 AM
 */
export const startNotificationCleanupCron = () => {
    // Schedule cleanup job to run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        try {
            console.log('Starting notification cleanup job...');
            const deletedCount = await deleteExpiredNotifications();
            console.log(`Notification cleanup completed. Deleted ${deletedCount} expired notifications.`);
        }
        catch (error) {
            console.error('Error during notification cleanup:', error);
        }
    }, {
        scheduled: true,
        timezone: 'UTC'
    });
    console.log('Notification cleanup cron job scheduled (daily at 2:00 AM UTC)');
};
/**
 * Manual cleanup function that can be called on demand
 */
export const manualNotificationCleanup = async () => {
    try {
        console.log('Starting manual notification cleanup...');
        const deletedCount = await deleteExpiredNotifications();
        console.log(`Manual notification cleanup completed. Deleted ${deletedCount} expired notifications.`);
        return deletedCount;
    }
    catch (error) {
        console.error('Error during manual notification cleanup:', error);
        return 0;
    }
};
