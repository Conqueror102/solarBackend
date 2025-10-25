// src/controllers/payments.controller.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { raw as rawParser } from "express";

import * as paystack from "../services/paystack.service.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";

// ⬇ our new enqueue producers (queue → worker does the heavy lifting)
import {
  enqueuePaymentVerify,
  enqueuePaymentEvent,
} from "../queues/producers/paymentProducers.js";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET!;

// Use ONLY on the webhook route
export const rawBodyParser = rawParser({ type: "*/*" });

/**
 * POST /paystack/init
 * Body: { orderId, callback_url? }
 * - stays synchronous since we must return Paystack's authorization_url
 */
export async function initPaystackPayment(req: Request, res: Response) {
  try {
    const { orderId, callback_url } = req.body as {
      orderId: string;
      callback_url?: string;
    };

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Ownership check (if customer endpoint)
    if (!order.user.equals((req as any).user._id)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (order.isPaid) return res.status(400).json({ error: "Order already paid" });

    // Freeze amount & currency for verification later
    order.currency = order.currency || "NGN";
    if (order.amountAtPayment == null) {
      order.amountAtPayment = order.totalAmount;
    }
    const amountKobo = Math.round((order.amountAtPayment ?? order.totalAmount) * 100);

    // Paystack needs customer email
    const user = await User.findById(order.user);
    if (!user?.email) return res.status(400).json({ error: "Customer email required" });

    // Move to ongoing (payment) if still pending
    if (!order.paymentStatus || order.paymentStatus === "pending") {
      order.paymentStatus = "ongoing";
      await order.save();
    }

    const initResp: any = await paystack.initialize({
      email: user.email,
      amount: amountKobo,
      currency: order.currency,
      metadata: { orderId: String(order._id), userId: String(order.user) },
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
    return res.status(400).json({ error: err.message || "Failed to init Paystack" });
  }
}

/**
 * GET /paystack/verify/:reference
 * - now enqueues a verify job and returns immediately
 */
export async function verifyPaystackPayment(req: Request, res: Response) {
  try {
    const { reference } = req.params;
    await enqueuePaymentVerify({ provider: "paystack", reference });
    return res.json({ queued: true, reference });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Verification enqueue failed" });
  }
}

/**
 * POST /paystack/webhook
 * - MUST use rawBodyParser on this route only
 * - verifies signature, normalizes, enqueues; worker does DB/email/notifications
 */
export async function paystackWebhook(req: Request, res: Response) {
  try {
    console.log(`[Webhook] Received webhook call`);
    
    const headerSig = req.header("x-paystack-signature");
    if (!headerSig || headerSig.length === 0) {
      console.log(`[Webhook] Missing signature header`);
      return res.sendStatus(401);
    }

    const raw = req.body as Buffer;
    const computed = crypto.createHmac("sha512", PAYSTACK_SECRET).update(raw).digest("hex");
    const valid =
      headerSig.length === computed.length &&
      crypto.timingSafeEqual(Buffer.from(headerSig), Buffer.from(computed));
    
    if (!valid) {
      console.log(`[Webhook] Invalid signature`);
      return res.sendStatus(401);
    }

    const event = JSON.parse(raw.toString("utf8"));
    console.log(`[Webhook] Event received:`, event.event, `Reference:`, event.data?.reference);

    // normalize eventType
    const eventType =
      event.event === "charge.success"
        ? "payment_succeeded"
        : event.event === "charge.failed" || event.event === "charge.abandoned"
        ? "payment_failed"
        : event.event === "refund.processed"
        ? "payment_refunded"
        : "payment_settlement"; // catch-all (e.g., chargeback/settlement)

    const data = event.data || {};
    const reference: string = data.reference;
    const amountMajor = typeof data.amount === "number" ? data.amount / 100 : undefined;

    console.log(`[Webhook] Processing ${eventType} for reference: ${reference}, amount: ${amountMajor}`);

    await enqueuePaymentEvent({
      provider: "paystack",
      eventType,
      eventId: String(data.id ?? data.reference ?? reference),
      reference,
      orderId: String(data?.metadata?.orderId ?? ""),
      amount: amountMajor,
      currency: data.currency ?? "NGN",
      customerEmail: data?.customer?.email,
      customerName: data?.customer?.first_name
        ? `${data.customer.first_name} ${data.customer.last_name ?? ""}`.trim()
        : undefined,
      raw: event,
    });

    console.log(`[Webhook] Successfully enqueued ${eventType} for reference: ${reference}`);
    return res.sendStatus(200);
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return res.sendStatus(400);
  }
}
