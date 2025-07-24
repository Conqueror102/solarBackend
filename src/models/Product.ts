
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
  stock: number;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  images: { type: [String], required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  stock: { type: Number, required: true, default: 0 },
}, { timestamps: true });

export const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);
