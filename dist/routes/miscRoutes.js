import { Router } from 'express';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { getAnalytics, getNotifications } from '../controllers/miscController.js';
const router = Router();
router.get('/analytics', protect, admin, getAnalytics);
router.get('/notifications', protect, admin, getNotifications);
export default router;
