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
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true }, // Added brand reference
    stock: { type: Number, required: true, default: 0 },
    sku: { type: String, unique: true, sparse: true }, // Added SKU
    specifications: { type: Object, default: {} }, // Added specifications
    isActive: { type: Boolean, default: true }, // Added active status
}, { timestamps: true });
// Indexes for better performance
productSchema.index({ name: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ category: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ isActive: 1 });
export const Product = mongoose.model('Product', productSchema);
