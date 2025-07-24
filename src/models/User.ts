
/**
 * User.js - User Schema
 * ---------------------
 * Defines the User model for authentication and authorization.
 */
import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  _id?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'superadmin';
  isDeactivated: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  preferences: Record<string, any>;
  addresses: IAddress[];
  matchPassword(enteredPassword: string): Promise<boolean>;
  createdAt?: Date;
  updatedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

const addressSchema = new Schema<IAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v: string) {
        // Simple email regex
        return /^\S+@\S+\.\S+$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid email!`
    }
  },
  password: {
    type: String,
    required: true,
    minlength: [8, 'Password must be at least 8 characters long']
  },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  isDeactivated: { type: Boolean, required: true, default: false },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  preferences: { type: Object, default: {} },
  addresses: { type: [addressSchema], default: [] },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
}, { timestamps: true });

userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
