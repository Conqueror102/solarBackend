/**
 * contactRoutes.ts - Contact Form Routes
 * ---------------------
 * Defines contact form API routes
 */
import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRoles } from '../middlewares/roleMiddleware.js';
import {
  submitContactForm,
  getContactMessages,
  getContactMessage,
  updateContactStatus,
  replyToContact,
  deleteContactMessage,
  getContactStats
} from '../controllers/contactController.js';

const router = Router();

// Public route - anyone can submit contact form
router.post('/', submitContactForm);

// Admin routes - require authentication and admin role
router.get('/', protect, requireRoles(['admin', 'superadmin']), getContactMessages);
router.get('/stats', protect, requireRoles(['admin', 'superadmin']), getContactStats);
router.get('/:id', protect, requireRoles(['admin', 'superadmin']), getContactMessage);
router.patch('/:id/status', protect, requireRoles(['admin', 'superadmin']), updateContactStatus);
router.post('/:id/reply', protect, requireRoles(['admin', 'superadmin']), replyToContact);
router.delete('/:id', protect, requireRoles(['admin', 'superadmin']), deleteContactMessage);

export default router;
