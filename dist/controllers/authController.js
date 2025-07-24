/**
 * authController.js
 * -----------------
 * Handles user registration, login, and profile management using JWT.
 */
import asyncHandler from 'express-async-handler';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendCustomEmail } from '../utils/email.js';
import { registerSchema, loginSchema } from '../validators/auth.js';
// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};
const registerUser = asyncHandler(async (req, res) => {
    const { error } = registerSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { name, email, password, role } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    // Create user
    const user = await User.create({
        name,
        email,
        password,
        role: role || 'user',
        emailVerificationToken,
        emailVerified: false,
    });
    // Prepare verification email
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${emailVerificationToken}&email=${encodeURIComponent(email)}`;
    const html = `<p>Welcome! Please <a href="${verifyUrl}">verify your email</a> to activate your account.</p>`;
    try {
        // Attempt to send verification email
        await sendCustomEmail(email, 'Verify Your Email', html);
    }
    catch (err) {
        // If email fails, rollback user
        await User.findByIdAndDelete(user._id);
        throw new Error('Failed to send verification email. Please try again later.');
    }
    // Success response
    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        message: 'Registration successful. Please check your email to verify your account.',
    });
});
const loginUser = asyncHandler(async (req, res) => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && user.isDeactivated) {
        res.status(403);
        throw new Error('Your account has been deactivated. Please contact support.');
    }
    if (user && !user.emailVerified) {
        res.status(403);
        throw new Error('Please verify your email before logging in.');
    }
    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    }
    else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
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
const logoutUser = asyncHandler(async (req, res) => {
    res.json({ message: 'Logged out successfully' });
});
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
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
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
export { registerUser, loginUser, getUserProfile, logoutUser, getCurrentUser, updateUserProfile, forgotPassword, resetPassword, changePassword, verifyEmail };
