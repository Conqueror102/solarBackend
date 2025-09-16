import mongoose, { Document, Schema, Model } from "mongoose";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "cancelled"
  | "refunded"
  | "chargeback"
  | "expired";

export interface ICustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface IStatusHistory {
  status: TransactionStatus;
  changedAt: Date;
}

export interface ITransaction extends Document {
  transactionId: number;
  status: TransactionStatus;
  statusHistory: IStatusHistory[];
  amount: number;
  currency: string;
  reference: string;
  paidAt?: Date;
  customer: ICustomer;
  createdAt: Date;
  updatedAt: Date;

  updateStatus: (newStatus: TransactionStatus) => Promise<void>;
}

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "successful",
        "failed",
        "cancelled",
        "refunded",
        "chargeback",
        "expired",
      ],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const transactionSchema = new Schema<ITransaction>(
  {
    transactionId: { type: Number, required: true, unique: true },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "successful",
        "failed",
        "cancelled",
        "refunded",
        "chargeback",
        "expired",
      ],
      default: "pending",
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    reference: { type: String, required: true },
    paidAt: Date,
    customer: {
      id: { type: Number, required: true },
      first_name: { type: String },
      last_name: { type: String },
      email: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// Helper method: update status & log history
transactionSchema.methods.updateStatus = async function (
  newStatus: TransactionStatus
) {
  if (this.status !== newStatus) {
    this.status = newStatus;
    this.statusHistory.push({ status: newStatus, changedAt: new Date() });
    await this.save();
  }
};

const Transaction: Model<ITransaction> = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema
);

export default Transaction;
