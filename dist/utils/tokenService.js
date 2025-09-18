import jwt from 'jsonwebtoken';
// import crypto from 'crypto';
// import { User } from '../models/User.js';
// TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
// Read environment variables once at module load time
export const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";
;
export const generatetoken = (userId) => {
    const options = {
        expiresIn: "7d",
    };
    return jwt.sign({ id: userId, type: "access" }, JWT_SECRET, options);
};
// TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
// export const generateRefreshToken = async (userId: string, ip?: string): Promise<string> => {
//   const user = await User.findById(userId);
//   if (!user) {
//     throw new Error('User not found');
//   }
//   // Generate a secure random token
//   const refreshToken = crypto.randomBytes(40).toString('hex');
//   const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
//   // Save the refresh token
//   await user.addRefreshToken(refreshToken, expiresAt, ip);
//   return refreshToken;
// };
export const verifytoken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        console.error("JWT verification failed:", error.message);
        return null;
    }
};
// TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
// export const revokeRefreshToken = async (userId: string, token: string, ip?: string): Promise<void> => {
//   const user = await User.findById(userId);
//   if (!user) {
//     throw new Error('User not found');
//   }
//   await user.revokeRefreshToken(token, ip);
// };
// TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
// export const rotateRefreshToken = async (userId: string, oldToken: string, ip?: string): Promise<string> => {
//   // Revoke the old token
//   await revokeRefreshToken(userId, oldToken, ip);
//   // Generate a new token
//   return await generateRefreshToken(userId, ip);
// };
// TEMPORARILY DISABLED: Enhanced token security for frontend compatibility
// export const verifyRefreshToken = async (token: string): Promise<string | null> => {
//   const user = await User.findOne({ 
//     'refreshTokens.token': token,
//     'refreshTokens.revokedAt': { $exists: false }
//   });
//   if (!user || !user.hasValidRefreshToken(token)) {
//     return null;
//   }
//   return user._id.toString();
// };
