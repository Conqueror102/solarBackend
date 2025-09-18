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
import { sendCustomEmail } from '../utils/email.js';
import { registerSchema, loginSchema } from '../validators/auth.js';
import { generatetoken
// TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
// generateRefreshToken, 
// verifyRefreshToken,
// rotateRefreshToken, 
// revokeRefreshToken
 } from '../utils/tokenService.js';
import { AppError, AuthenticationError, DuplicateError, SAFE_ERROR_MESSAGES, ValidationError } from '../utils/errorUtils.js';
// Read environment variables once at module load time
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
const NODE_ENV = process.env.NODE_ENV;
const registerUser = asyncHandler(async (req, res) => {
    const { error } = registerSchema.validate(req.body);
    if (error) {
        throw new ValidationError(SAFE_ERROR_MESSAGES.VALIDATION_FAILED);
    }
    const { name, email, password, role } = req.body;
    // TEMPORARILY DISABLED: Enhanced password validation for frontend compatibility
    // const passwordValidation = PasswordValidationService.validatePassword(password);
    // if (!passwordValidation.isValid) {
    //     throw new ValidationError('Password does not meet security requirements');
    // }
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
    // Send verification email
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${emailVerificationToken}&email=${encodeURIComponent(email)}`;
    const html = `<p>Welcome! Please <a href="${verifyUrl}">verify your email</a> to activate your account.</p>`;
    try {
        await sendCustomEmail(email, 'Verify Your Email', html);
    }
    catch (error) {
        // Delete the created user if email sending fails
        await user.deleteOne();
        throw new AppError('Unable to send verification email', 500, 'EMAIL_ERROR');
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
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await user.save();
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const html = `<p>You requested a password reset. <a href="${resetUrl}">Click here to reset your password</a>. This link is valid for 1 hour.</p>`;
    await sendCustomEmail(email, 'Password Reset Request', html);
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
    // TEMPORARILY DISABLED: Enhanced password validation for frontend compatibility
    // const passwordValidation = PasswordValidationService.validatePassword(newPassword);
    // if (!passwordValidation.isValid) {
    //     res.status(400);
    //     throw new Error(`New password is too weak: ${passwordValidation.errors.join(', ')}`);
    // }
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
const logoutUser = asyncHandler(async (req, res) => {
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
export { registerUser, loginUser, getUserProfile, logoutUser, getCurrentUser, updateUserProfile, forgotPassword, resetPassword, changePassword, verifyEmail
// TEMPORARILY DISABLED: refreshtoken 
 };
