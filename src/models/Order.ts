
  /**
   * Order.js - Order Schema
   * -----------------------
   * Defines the Order model for storing user orders and payments.
   */
  import mongoose, { Document, Schema, Model, Types } from 'mongoose';

  export interface IOrderItem {
    product: Types.ObjectId;
    qty: number;
    price: number;
  }

  export interface IAddress {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }

  export interface IOrder extends Document {
    user: Types.ObjectId;
    orderItems: IOrderItem[];
    totalAmount: number;
    isPaid: boolean;
    paidAt?: Date;
    paymentMethod: string;
    paymentStatus: string;
    status: string;
    shippingAddress: IAddress;
    billingAddress: IAddress;
    paystackReference?: string | null;
    amountAtPayment?: number | null;
    currency?: 'NGN' | 'GHS' | 'USD';
    createdAt?: Date;
    updatedAt?: Date;
  }

  const orderItemSchema = new Schema<IOrderItem>({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
  });

  const addressSchema = new Schema<IAddress>({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  });

  const orderSchema = new Schema<IOrder>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    paymentMethod: { type: String, required: true },
    paymentStatus: {
      type: String,
      required: true,
      default: 'Pending',
      enum: [
        'Pending',      // Initial payment state
        'Processing',   // Payment is being processed
        'Completed',    // Payment successful
        'Failed',       // Payment failed
        'Refunded'      // Payment was refunded
      ]
    },
    status: { 
      type: String, 
      required: true, 
      default: 'New',
      enum: [
        'New',          // Fresh order
        'Processing',   // Order is being processed
        'Shipped',      // Order has been shipped
        'Delivered',    // Order has been delivered
        'Cancelled'     // Order was cancelled
      ]
    },
    paystackReference: { type: String, default: null },
    currency: { type: String, default: "NGN" },
    shippingAddress: { type: addressSchema, required: true },
    billingAddress: { type: addressSchema, required: true },
  }, { timestamps: true });

  orderSchema.index(
    { paystackReference: 1 },
    { unique: true, partialFilterExpression: { paystackReference: { $type: 'string' } } }
  );

  export const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);
