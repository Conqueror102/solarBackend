import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISettings extends Document {
  businessName: string;
  businessEmail: string;
  notificationEmails?: string[];
  preferences: Record<string, any>;
}

const settingsSchema = new Schema<ISettings>({
  businessName: { type: String, required: true },
  businessEmail: { type: String, required: true },
  notificationEmails: { type: [String], default: [] },
  preferences: { type: Object, default: {} },
}, { timestamps: true });

export const Settings: Model<ISettings> = mongoose.model<ISettings>('Settings', settingsSchema); 