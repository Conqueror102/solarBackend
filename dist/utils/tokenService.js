import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
export const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId, type: 'access' }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};
export const generateRefreshToken = async (userId, ip) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    // Generate a secure random token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    // Save the refresh token
    await user.addRefreshToken(refreshToken, expiresAt, ip);
    return refreshToken;
};
export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};
export const revokeRefreshToken = async (userId, token, ip) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    await user.revokeRefreshToken(token, ip);
};
export const rotateRefreshToken = async (userId, oldToken, ip) => {
    // Revoke the old token
    await revokeRefreshToken(userId, oldToken, ip);
    // Generate a new token
    return await generateRefreshToken(userId, ip);
};
export const verifyRefreshToken = async (token) => {
    const user = await User.findOne({
        'refreshTokens.token': token,
        'refreshTokens.revokedAt': { $exists: false }
    });
    if (!user || !user.hasValidRefreshToken(token)) {
        return null;
    }
    return user._id.toString();
};
