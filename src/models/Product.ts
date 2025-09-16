
/**
 * Product.js - Product Schema
 * ---------------------------
 * Defines the Product model for storing solar products.
 */
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  images: string[];
  category: Types.ObjectId;
  brand: Types.ObjectId; // Added brand reference
  stock: number;
  sku?: string; // Added SKU for better product identification
  specifications?: Record<string, any>; // Added specifications
  isActive: boolean; // Added active status
  createdAt?: Date;
  updatedAt?: Date;
}

const productSchema = new Schema<IProduct>({
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

export const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);
