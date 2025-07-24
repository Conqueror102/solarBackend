/**
 * Product.js - Product Schema
 * ---------------------------
 * Defines the Product model for storing solar products.
 */
import mongoose, { Schema } from 'mongoose';
const productSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    images: { type: [String], required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    stock: { type: Number, required: true, default: 0 },
}, { timestamps: true });
export const Product = mongoose.model('Product', productSchema);
