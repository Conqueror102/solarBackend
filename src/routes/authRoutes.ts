
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { registerUser, loginUser, getUserProfile, logoutUser, getCurrentUser, updateUserProfile, forgotPassword, resetPassword, changePassword, verifyEmail, resendVerificationEmail } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many attempts, please try again later.'
});

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationEmail);
router.get('/profile', protect, getUserProfile);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateUserProfile);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);

export default router;
