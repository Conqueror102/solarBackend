/**
 * authCimport { generatetoken,
    generateRefreshToken,
    verifyRefreshToken,
    rotateRefreshToken
} from '../utils/tokenService.js';
import { PasswordValidationService } from '../utils/passwordValidation.js';ller.js
 * -----------------
 * Handles user registration, login, and profile management using JWT.
 */
import asyncHandler from 'express-async-handler';
import { User } from '../models/User.js';
import crypto from 'crypto';
// import { sendCustomEmail } from '../utils/email.js'; // moved to queue workers
import { registerSchema, loginSchema } from '../validators/auth.js';
import { generatetoken
// TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
// generateRefreshToken, 
// verifyRefreshToken,
// rotateRefreshToken, 
// revokeRefreshToken
 } from '../utils/tokenService.js';
import { AuthenticationError, DuplicateError, SAFE_ERROR_MESSAGES, ValidationError } from '../utils/errorUtils.js';
import { PasswordValidationService } from '../utils/passwordValidation.js';
// NEW: throttle + email producers for queued emails
import { throttleOnce } from '../utils/throttle.js';
import { enqueueEmailVerification, enqueuePasswordResetEmail } from '../queues/producers/emailProducers.js';
// Read environment variables once at module load time
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
const NODE_ENV = process.env.NODE_ENV;
// Throttle windows (seconds)
const VERIFY_EMAIL_THROTTLE_SEC = 10 * 60; // 10 minutes
const RESET_EMAIL_THROTTLE_SEC = 10 * 60; // 10 minutes
const registerUser = asyncHandler(async (req, res) => {
    const { error } = registerSchema.validate(req.body);
    if (error) {
        throw new ValidationError(SAFE_ERROR_MESSAGES.VALIDATION_FAILED);
    }
    const { name, email, password, role } = req.body;
    // Password strength checks (kept as in your latest version)
    const passwordValidation = PasswordValidationService.validatePassword(password);
    if (!passwordValidation.isValid) {
        const formattedError = PasswordValidationService.formatPasswordErrors([...passwordValidation.errors]);
        throw new ValidationError(formattedError);
    }
    if (role && role !== 'user') {
        throw new AuthenticationError('Invalid registration request');
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new DuplicateError('account');
    }
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
        name,
        email,
        password,
        role: 'user',
        emailVerificationToken,
        emailVerified: false
    });
    // SERVER-SIDE THROTTLE: verification email (key by email)
    const throttleKey = `auth:verify:${email.toLowerCase()}`;
    const { allowed } = await throttleOnce(throttleKey, VERIFY_EMAIL_THROTTLE_SEC);
    if (allowed) {
        // Enqueue verification email (idempotent per user+token)
        await enqueueEmailVerification({
            to: email,
            userName: name,
            token: emailVerificationToken,
            frontendUrl: FRONTEND_URL,
            userId: String(user._id),
        });
    }
    else {
        if (NODE_ENV !== 'production') {
            console.log(`Verification email throttled for ${email}`);
        }
    }
    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        message: 'Registration successful. Please check your email to verify your account.'
    });
});
const loginUser = asyncHandler(async (req, res) => {
    // Validate request body
    const { error } = loginSchema.validate(req.body);
    if (error) {
        throw new ValidationError(SAFE_ERROR_MESSAGES.VALIDATION_FAILED);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    // Use consistent error message for invalid credentials
    if (!user) {
        throw new AuthenticationError(SAFE_ERROR_MESSAGES.INVALID_PASSWORD);
    }
    if (user.isDeactivated) {
        throw new AuthenticationError(SAFE_ERROR_MESSAGES.ACCOUNT_LOCKED);
    }
    if (!user.emailVerified) {
        throw new AuthenticationError('Email verification required');
    }
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
        throw new AuthenticationError(SAFE_ERROR_MESSAGES.INVALID_PASSWORD);
    }
    // TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
    // Generate tokens
    const token = generatetoken(user._id);
    // const refreshToken = await generateRefreshToken(user._id, req.ip);
    // Set refresh token in HTTP-only cookie
    // res.cookie('refreshToken', refreshToken, {
    //     httpOnly: true,
    //     secure: process.env.NODE_ENV === 'production',
    //     sameSite: 'strict',
    //     maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    // });
    // Send response without sensitive information
    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
    });
});
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
// const logoutUser = asyncHandler(async (req: Request, res: Response) => {
//     res.json({ message: 'Logged out successfully' });
// });
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
        return;
    }
    // SERVER-SIDE THROTTLE: reset email (key by userId)
    const resetThrottleKey = `auth:reset:${String(user._id)}`;
    const { allowed } = await throttleOnce(resetThrottleKey, RESET_EMAIL_THROTTLE_SEC);
    // Issue/reset token (keep your existing behavior)
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await user.save();
    if (allowed) {
        // Enqueue password reset email (idempotent per user+token)
        await enqueuePasswordResetEmail({
            to: user.email,
            userName: user.name,
            token,
            frontendUrl: FRONTEND_URL,
            userId: String(user._id),
        });
    }
    else {
        if (NODE_ENV !== 'production') {
            console.log(`Password reset email throttled for user ${user._id}`);
        }
    }
    res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
});
const resetPassword = asyncHandler(async (req, res) => {
    const { email, token, password } = req.body;
    const user = await User.findOne({ email, passwordResetToken: token, passwordResetExpires: { $gt: new Date() } });
    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token');
    }
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.json({ message: 'Password has been reset successfully' });
});
const changePassword = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const { currentPassword, newPassword } = req.body;
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    if (!(await user.matchPassword(currentPassword))) {
        res.status(400);
        throw new Error('Current password is incorrect');
    }
    // Password strength checks (kept as in your latest version)
    const passwordValidation = PasswordValidationService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
        const formattedError = PasswordValidationService.formatPasswordErrors([...passwordValidation.errors]);
        res.status(400);
        throw new Error(formattedError);
    }
    // Check if new password is same as current
    if (await user.matchPassword(newPassword)) {
        res.status(400);
        throw new Error('New password cannot be the same as current password');
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
});
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        // Password update removed for security
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role
        });
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
const verifyEmail = asyncHandler(async (req, res) => {
    const { email, token } = req.body;
    const user = await User.findOne({ email, emailVerificationToken: token });
    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired verification token');
    }
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
    res.json({ message: 'Email verified successfully. You can now log in.' });
});
const resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ValidationError('Email is required');
    }
    const user = await User.findOne({ email });
    if (!user) {
        // Return success message even if user doesn't exist for security
        res.status(200).json({ message: 'If that email is registered and not verified, a verification email has been sent.' });
        return;
    }
    if (user.emailVerified) {
        res.status(400).json({ message: 'Email is already verified' });
        return;
    }
    // Generate new email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = emailVerificationToken;
    await user.save();
    // SERVER-SIDE THROTTLE: verification email (key by email)
    const throttleKey = `auth:verify:${email.toLowerCase()}`;
    const { allowed } = await throttleOnce(throttleKey, VERIFY_EMAIL_THROTTLE_SEC);
    if (allowed) {
        // Enqueue verification email (idempotent per user+token)
        await enqueueEmailVerification({
            to: email,
            userName: user.name,
            token: emailVerificationToken,
            frontendUrl: FRONTEND_URL,
            userId: String(user._id),
        });
    }
    else {
        if (NODE_ENV !== 'production') {
            console.log(`Verification email throttled for ${email}`);
        }
    }
    res.status(200).json({ message: 'If that email is registered and not verified, a verification email has been sent.' });
});
// TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
// const refreshtoken = asyncHandler(async (req: Request, res: Response) => {
//     const refreshToken = req.cookies.refreshToken;
//     if (!refreshToken) {
//         res.status(401);
//         throw new Error('Refresh token not found');
//     }
//     const userId = await verifyRefreshToken(refreshToken);
//     if (!userId) {
//         res.status(401);
//         throw new Error('Invalid or expired refresh token');
//     }
//     // Generate new tokens
//     const newtoken = generatetoken(userId);
//     const newRefreshToken = await rotateRefreshToken(userId, refreshToken, req.ip);
//     // Set new refresh token in HTTP-only cookie
//     res.cookie('refreshToken', newRefreshToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === 'production',
//         sameSite: 'strict',
//         maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
//     });
//     res.json({ token: newtoken });
// });
// TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
// Update logout to handle refresh tokens
const logoutUser = asyncHandler(async (_req, res) => {
    // const refreshToken = req.cookies.refreshToken;
    // if (refreshToken) {
    //     const userId = await verifyRefreshToken(refreshToken);
    //     if (userId) {
    //         await revokeRefreshToken(userId, refreshToken, req.ip);
    //     }
    // }
    // res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
});
export { registerUser, loginUser, getUserProfile, logoutUser, getCurrentUser, updateUserProfile, forgotPassword, resetPassword, changePassword, verifyEmail, resendVerificationEmail
// TEMPORARILY DISABLED: refreshtoken 
 };
