import mongoose, { Schema } from 'mongoose';
const settingsSchema = new Schema({
    businessName: { type: String, required: true },
    businessEmail: { type: String, required: true },
    notificationEmails: { type: [String], default: [] },
    preferences: { type: Object, default: {} },
}, { timestamps: true });
export const Settings = mongoose.model('Settings', settingsSchema);
