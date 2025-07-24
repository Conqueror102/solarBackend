import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
const router = Router();
router.route('/')
    .get(protect, requireRole('superadmin'), getSettings)
    .put(protect, requireRole('superadmin'), updateSettings);
export default router;
