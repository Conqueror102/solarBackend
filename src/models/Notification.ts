/**
 * Notification.ts - Notification Schema
 * ---------------------
 * Defines the Notification model for user notifications.
 */
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: 'order_status' | 'payment_success' | 'payment_failed' | 'product_restock' | 'promotion' | 'system' | 'email_verification' | 'password_reset';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isDeleted: boolean;
  readAt?: Date;
  expiresAt?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt?: Date;
  updatedAt?: Date;
}

const notificationSchema = new Schema<INotification>({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['order_status', 'payment_success', 'payment_failed', 'product_restock', 'promotion', 'system', 'email_verification', 'password_reset'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    type: Object,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, { timestamps: true });

// Auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, isDeleted: 1 });

export const Notification: Model<INotification> = mongoose.model<INotification>('Notification', notificationSchema);
