/**
 * User.js - User Schema
 * ---------------------
 * Defines the User model for authentication and authorization.
 */
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
const addressSchema = new Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
}, { _id: true });
const refreshTokenSchema = new Schema({
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    issuedIp: String,
    revokedAt: Date,
    revokedByIp: String,
    replacedByToken: String
});
const userSchema = new Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v) {
                // Simple email regex
                return /^\S+@\S+\.\S+$/.test(v);
            },
            message: (props) => `${props.value} is not a valid email!`
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        validate: {
            validator: function (password) {
                // Check for minimum length
                if (password.length < 10)
                    return false;
                // Check for uppercase letter
                if (!/[A-Z]/.test(password))
                    return false;
                // Check for lowercase letter
                if (!/[a-z]/.test(password))
                    return false;
                // Check for numbers
                if (!/\d/.test(password))
                    return false;
                // Check for special characters
                if (!/[@$!%*?&]/.test(password))
                    return false;
                // Check for maximum of 2 consecutive identical characters
                if (/(.)\1{2,}/.test(password))
                    return false;
                return true;
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&). It cannot contain more than 2 consecutive identical characters.'
        }
    },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    isDeactivated: { type: Boolean, required: true, default: false },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    preferences: { type: Object, default: {} },
    addresses: { type: [addressSchema], default: [] },
    refreshTokens: { type: [refreshTokenSchema], default: [] },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
}, { timestamps: true });
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
userSchema.methods.addRefreshToken = async function (token, expiresAt, ip) {
    const newRefreshToken = {
        token,
        expiresAt,
        createdAt: new Date(),
        issuedIp: ip
    };
    this.refreshTokens.push(newRefreshToken);
    await this.save();
};
userSchema.methods.revokeRefreshToken = async function (token, ip) {
    const refreshToken = this.refreshTokens.find((rt) => rt.token === token && !rt.revokedAt);
    if (refreshToken) {
        refreshToken.revokedAt = new Date();
        refreshToken.revokedByIp = ip;
        await this.save();
    }
};
userSchema.methods.hasValidRefreshToken = function (token) {
    return this.refreshTokens.some((rt) => rt.token === token &&
        !rt.revokedAt &&
        rt.expiresAt > new Date());
};
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
export const User = mongoose.model('User', userSchema);
