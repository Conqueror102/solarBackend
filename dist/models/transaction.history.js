import mongoose, { Schema } from "mongoose";
const statusHistorySchema = new Schema({
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
}, { _id: false });
const transactionSchema = new Schema({
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
}, { timestamps: true });
// Helper method: update status & log history
transactionSchema.methods.updateStatus = async function (newStatus) {
    if (this.status !== newStatus) {
        this.status = newStatus;
        this.statusHistory.push({ status: newStatus, changedAt: new Date() });
        await this.save();
    }
};
const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
