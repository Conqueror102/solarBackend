/**
 * Order.js - Order Schema
 * -----------------------
 * Defines the Order model for storing user orders and payments.
 */
import mongoose, { Schema } from 'mongoose';
const orderItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
});
const addressSchema = new Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
});
const orderSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    paymentMethod: { type: String, required: true },
    status: { type: String, required: true, default: 'pending' },
    shippingAddress: { type: addressSchema, required: true },
    billingAddress: { type: addressSchema, required: true },
}, { timestamps: true });
export const Order = mongoose.model('Order', orderSchema);
