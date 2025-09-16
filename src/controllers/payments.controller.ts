import { Request, Response } from "express";
import crypto from "crypto";
import { raw as rawParser } from "express";
import * as paystack from "../services/paystack.service.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { sendOrderStatusUpdateEmail } from "../utils/email.js";
import {
  createPaymentSuccessNotification,
  createPaymentFailedNotification,
} from "../utils/notificationService.js";
import {
  notifyPaymentReceived,
  notifyPaymentFailed,
} from "../utils/adminNotificationService.js";
import Transaction from "../models/transaction.history.js";

// Read environment variables once at module load time
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET!;

// IMPORTANT: use this ONLY on the webhook route
export const rawBodyParser = rawParser({ type: "*/*" });

/**
 * POST /paystack/init
 * Body: { orderId, callback_url? }
 */
export async function initPaystackPayment(req: Request, res: Response) {
  try {
    const { orderId, callback_url } = req.body as {
      orderId: string;
      callback_url?: string;
    };

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Ownership check (if this route is for customers)
    if (!order.user.equals((req as any).user._id)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (order.isPaid)
      return res.status(400).json({ error: "Order already paid" });

    // Freeze amount & currency
    order.currency = order.currency || "NGN";
    if (order.amountAtPayment == null) {
      order.amountAtPayment = order.totalAmount;
    }
    const amountKobo = Math.round(
      (order.amountAtPayment ?? order.totalAmount) * 100
    );

    // Fetch customer email (needed by Paystack)
    const user = await User.findById(order.user);
    if (!user?.email)
      return res.status(400).json({ error: "Customer email required" });

    // Move to Processing (payment)
    if (!order.paymentStatus || order.paymentStatus === "Pending") {
      order.paymentStatus = "Processing";
      await order.save();
    }

    const initResp: any = await paystack.initialize({
      email: user.email,
      amount: amountKobo,
      currency: order.currency,
      metadata: {
        orderId: String(order._id),
        userId: String(order.user),
      },
      ...(callback_url ? { callback_url } : {}),
    });

    order.paystackReference = initResp.data.reference;
    await order.save();

    return res.json({
      orderId: order._id,
      reference: initResp.data.reference,
      authorization_url: initResp.data.authorization_url,
      access_code: initResp.data.access_code,
    });
  } catch (err: any) {
    return res
      .status(400)
      .json({ error: err.message || "Failed to init Paystack" });
  }
}

/**
 * GET /paystack/verify/:reference
 * Optional polling endpoint for your success page.
 */
export async function verifyPaystackPayment(req: Request, res: Response) {
  try {
    const { reference } = req.params;

    const verifyResp: any = await paystack.verify(reference);
    const trx = verifyResp.data;

    const order = await Order.findOne({ paystackReference: reference });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const amountKobo = Math.round(
      (order.amountAtPayment ?? order.totalAmount) * 100
    );
    const currency = order.currency || "NGN";

    if (
      trx.status === "success" &&
      trx.amount === amountKobo &&
      trx.currency === currency
    ) {
      const firstTime = !order.isPaid;
      if (firstTime) {
        order.isPaid = true;
        order.paidAt = new Date();
      }
      order.paymentStatus = "Completed";
      if (order.status === "New") order.status = "Processing";
      await order.save();

      if (firstTime) {
        const user = await User.findById(order.user);
        if (user?.email) {
          await sendOrderStatusUpdateEmail(
            { email: user.email, name: (user as any).name },
            {
              _id: order._id.toString(),
              totalAmount: order.totalAmount,
              status: order.status,
              paymentStatus: order.paymentStatus,
            }
          );
        }
        await createPaymentSuccessNotification(
          order.user.toString(),
          order._id.toString(),
          order.totalAmount,
          order.paymentMethod ?? "paystack",
          order.currency
        );
        await notifyPaymentReceived(
          order._id.toString(),
          order.totalAmount,
          order.paymentMethod || "paystack",
          (user as any)?.name || "Unknown Customer"
        );
      }
    } else if (
      (trx.status === "failed" || trx.status === "abandoned") &&
      !order.isPaid
    ) {
      order.paymentStatus = "Failed";
      await order.save();
    }

    const user = await User.findById(order.user);
    if (user?.email) {
      await sendOrderStatusUpdateEmail(
        { email: user.email, name: (user as any).name },
        {
          _id: order._id.toString(),
          totalAmount: order.totalAmount,
          status: order.status,
          paymentStatus: order.paymentStatus,
        }
      );
    }
    await createPaymentFailedNotification(
      order.user.toString(),
      order._id.toString(),
      order.totalAmount,
      order.paymentMethod || "paystack",
      "Payment verification failed",
      order.currency || "NGN"
    );
    await notifyPaymentFailed(
      order._id.toString(),
      order.totalAmount,
      order.paymentMethod || "paystack",
      trx.status === "failed"
        ? "Payment verification failed"
        : "Payment abandoned",
      (user as any)?.name || "Unknown Customer"
    );

    return res.json({
      paid: order.isPaid,
      paymentStatus: order.paymentStatus,
      status: order.status,
      orderId: order._id,
    });
  } catch (err: any) {
    return res
      .status(400)
      .json({ error: err.message || "Verification failed" });
  }
}

/**
 * POST /paystack/webhook
 * MUST use rawBodyParser on this route only.
 */

export async function paystackWebhook(req: Request, res: Response) {
  try {
    // Verify Paystack signature
    const headerSig = req.header("x-paystack-signature");
    if (!headerSig) return res.sendStatus(401);

    const secret = PAYSTACK_SECRET;
    const raw = req.body as Buffer;
    const computed = crypto
      .createHmac("sha512", secret)
      .update(raw)
      .digest("hex");

    const valid =
      headerSig.length === computed.length &&
      crypto.timingSafeEqual(Buffer.from(headerSig), Buffer.from(computed));
    if (!valid) return res.sendStatus(401);

    const event = JSON.parse(raw.toString("utf8"));
    const reference: string = event.data.reference;

    // Defensive verify with Paystack
    const verifyResp: any = await paystack.verify(reference);
    const trxData = verifyResp.data;

    // Upsert into Transaction collection
    let trx = await Transaction.findOneAndUpdate(
      { transactionId: trxData.id },
      {
        $setOnInsert: {
          transactionId: trxData.id,
          amount: trxData.amount / 100, // convert from kobo
          currency: trxData.currency,
          reference: trxData.reference,
          customer: {
            id: trxData.customer.id,
            first_name: trxData.customer.first_name,
            last_name: trxData.customer.last_name,
            email: trxData.customer.email,
          },
          paidAt: trxData.paid_at,
        },
      },
      { upsert: true, new: true }
    );

    // Handle different event types
    switch (event.event) {
      case "charge.success":
        await trx.updateStatus("successful");
        break;
      case "charge.failed":
      case "charge.abandoned":
        await trx.updateStatus("failed");
        break;
      case "refund.processed":
        await trx.updateStatus("refunded");
        break;
      case "chargeback":
        await trx.updateStatus("chargeback");
        break;
      default:
        console.log("Unhandled event:", event.event);
    }

    // Update Order if linked
    const order = await Order.findOne({ paystackReference: reference });
    if (order) {
      if (trx.status === "successful") {
        const firstTime = !order.isPaid;
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentStatus = "Completed";
        if (order.status === "New") order.status = "Processing";
        await order.save();

        if (firstTime) {
          const user = await User.findById(order.user);
          if (user?.email) {
            await sendOrderStatusUpdateEmail(
              { email: user.email, name: (user as any).name },
              {
                _id: order._id.toString(),
                totalAmount: order.totalAmount,
                status: order.status,
                paymentStatus: order.paymentStatus,
              }
            );
          }
          await createPaymentSuccessNotification(
            order.user.toString(),
            order._id.toString(),
            order.totalAmount,
            order.paymentMethod || "paystack",
            order.currency
          );
          await notifyPaymentReceived(
            order._id.toString(),
            order.totalAmount,
            order.paymentMethod || "paystack",
            (user as any)?.name || "Unknown Customer"
          );
        }
      } else if (trx.status === "failed") {
        if (!order.isPaid) {
          order.paymentStatus = "Failed";
          await order.save();

          const user = await User.findById(order.user);
          if (user?.email) {
            await sendOrderStatusUpdateEmail(
              { email: user.email, name: (user as any).name },
              {
                _id: order._id.toString(),
                totalAmount: order.totalAmount,
                status: order.status,
                paymentStatus: order.paymentStatus,
              }
            );
          }
          await createPaymentFailedNotification(
            order.user.toString(),
            order._id.toString(),
            order.totalAmount,
            order.paymentMethod || "paystack",
            trx.status,
            order.currency
          );
          await notifyPaymentFailed(
            order._id.toString(),
            order.totalAmount,
            order.paymentMethod || "paystack",
            trx.status,
            (user as any)?.name || "Unknown"
          );
        }
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return res.sendStatus(400);
  }
}
