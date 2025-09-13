import mongoose, { Document, Schema } from "mongoose";

export interface ICustomer {
  id: number;
  first_name?: string;
  last_name?: string;
  email: string;
}

export interface ITransaction extends Document {
  transactionId: number;
  status: string;
  amount: number;
  currency: string;
  reference: string;
  paidAt: Date;
  customer: ICustomer;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    transactionId: { type: Number, required: true, unique: true },
    status: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    reference: { type: String, required: true },
    paidAt: { type: Date, required: true },
    customer: {
      id: { type: Number, required: true },
      first_name: { type: String },
      last_name: { type: String },
      email: { type: String, required: true }
    }
  },
  { timestamps: true }
);

// Avoid model overwrite in dev with hot reload
const Transaction =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", transactionSchema);

export default Transaction;
