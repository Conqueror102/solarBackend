import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
}

const categorySchema = new Schema<ICategory>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
}, { timestamps: true });

export const Category: Model<ICategory> = mongoose.model<ICategory>('Category', categorySchema); 