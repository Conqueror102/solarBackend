
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

export interface IRefreshToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
  issuedIp?: string;
  revokedAt?: Date;
  revokedByIp?: string;
  replacedByToken?: string;
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
  refreshTokens: IRefreshToken[];
  matchPassword(enteredPassword: string): Promise<boolean>;
  addRefreshToken(token: string, expiresAt: Date, ip?: string): Promise<void>;
  revokeRefreshToken(token: string, ip?: string): Promise<void>;
  hasValidRefreshToken(token: string): boolean;
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

const refreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  issuedIp: String,
  revokedAt: Date,
  revokedByIp: String,
  replacedByToken: String
});

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
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    validate: {
      validator: function(password: string) {
        // Check for minimum length
        if (password.length < 10) return false;

        // Check for uppercase letter
        if (!/[A-Z]/.test(password)) return false;

        // Check for lowercase letter
        if (!/[a-z]/.test(password)) return false;

        // Check for numbers
        if (!/\d/.test(password)) return false;

        // Check for special characters
        if (!/[@$!%*?&]/.test(password)) return false;

        // Check for maximum of 2 consecutive identical characters
        if (/(.)\1{2,}/.test(password)) return false;

        return true;
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&). It cannot contain more than 2 consecutive identical characters.'
    }
  },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  isDeactivated: { type: Boolean, required: true, default: false },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  preferences: { type: Object, default: {} },
  addresses: { type: [addressSchema], default: [] },
  refreshTokens: { type: [refreshTokenSchema], default: [] },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
}, { timestamps: true });

userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.addRefreshToken = async function(token: string, expiresAt: Date, ip?: string): Promise<void> {
  const newRefreshToken: IRefreshToken = {
    token,
    expiresAt,
    createdAt: new Date(),
    issuedIp: ip
  };
  this.refreshTokens.push(newRefreshToken);
  await this.save();
};

userSchema.methods.revokeRefreshToken = async function(token: string, ip?: string): Promise<void> {
  const refreshToken = this.refreshTokens.find((rt: IRefreshToken) => rt.token === token && !rt.revokedAt);
  if (refreshToken) {
    refreshToken.revokedAt = new Date();
    refreshToken.revokedByIp = ip;
    await this.save();
  }
};

userSchema.methods.hasValidRefreshToken = function(token: string): boolean {
  return this.refreshTokens.some((rt: IRefreshToken) => 
    rt.token === token && 
    !rt.revokedAt && 
    rt.expiresAt > new Date()
  );
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
