import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBrand extends Document {
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  country?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const brandSchema = new Schema<IBrand>({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  logo: { 
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Logo must be a valid image URL'
    }
  },
  website: { 
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL'
    }
  },
  country: { 
    type: String,
    maxlength: [50, 'Country name cannot exceed 50 characters']
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
brandSchema.index({ name: 1 });
brandSchema.index({ isActive: 1 });

// Virtual for product count
brandSchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'brand',
  count: true
});

export const Brand: Model<IBrand> = mongoose.model<IBrand>('Brand', brandSchema);
