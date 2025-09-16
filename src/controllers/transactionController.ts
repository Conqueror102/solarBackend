// controllers/transactionController.ts
import { Request, Response } from "express";
import Transaction, { ITransaction } from "../models/transaction.history.js";

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      reference,
      status,
      customerEmail,
      channel,
      startDate,
      endDate,
      page = "1",
      limit = "10",
    } = req.query;

    // Build query object
    const query: Record<string, any> = {};

    if (reference) query.reference = reference;
    if (status) query.status = status;
    if (customerEmail)
      query["customer.email"] = { $regex: customerEmail as string, $options: "i" };
    if (channel) query.paymentChannel = channel;

    // Date range filter
    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) query.paidAt.$gte = new Date(startDate as string);
      if (endDate) query.paidAt.$lte = new Date(endDate as string);
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const transactions: ITransaction[] = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let transaction: ITransaction | null = null;

    // Try finding by MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      transaction = await Transaction.findById(id);
    }

    // If not found, try Paystack reference
    if (!transaction) {
      transaction = await Transaction.findOne({ reference: id });
    }

    // If still not found, try Paystack transactionId
    if (!transaction && !isNaN(Number(id))) {
      transaction = await Transaction.findOne({ transactionId: Number(id) });
    }

    if (!transaction) {
      res.status(404).json({ success: false, message: "Transaction not found" });
      return;
    }

    res.json({ success: true, transaction });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
