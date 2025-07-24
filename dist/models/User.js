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
        required: true,
        minlength: [8, 'Password must be at least 8 characters long']
    },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    isDeactivated: { type: Boolean, required: true, default: false },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    preferences: { type: Object, default: {} },
    addresses: { type: [addressSchema], default: [] },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
}, { timestamps: true });
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
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
