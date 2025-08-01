/**
 * notificationRoutes.ts - Notification Routes
 * ---------------------
 * Defines all notification-related API routes with proper authentication
 * and role-based access control.
 */
import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRole, requireRoles } from '../middlewares/roleMiddleware.js';
import {
    getNotifications,
    getNotificationById,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    getNotificationStats,
    createNotification,
    createBulkNotifications
} from '../controllers/notificationController.js';

const router = Router();

// User routes (authenticated users can access their own notifications)
router.route('/')
    .get(protect, getNotifications);

router.route('/stats')
    .get(protect, getNotificationStats);

router.route('/read-all')
    .patch(protect, markAllAsRead);

router.route('/:id')
    .get(protect, getNotificationById)
    .delete(protect, deleteNotification);

router.route('/:id/read')
    .patch(protect, markAsRead);

router.route('/:id/unread')
    .patch(protect, markAsUnread);

// Admin routes (only admin/superadmin can create notifications)
router.route('/')
    .post(protect, requireRoles(['admin', 'superadmin']), createNotification);

router.route('/bulk')
    .post(protect, requireRoles(['admin', 'superadmin']), createBulkNotifications);

export default router;
