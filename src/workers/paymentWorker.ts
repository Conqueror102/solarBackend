import { makeWorker } from '../infra/bullmq.js';
import type { PaymentEventJob, PaymentVerifyJob } from '../types/paymentJobs.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import Transaction from '../models/transaction.history.js';
import * as paystack from '../services/paystack.service.js';

import { redis } from '../config/redis.js';

// helpers
import { sendOrderStatusUpdateEmail } from '../utils/email.js';
import {
  createPaymentSuccessNotification,
  createPaymentFailedNotification,
} from '../utils/notificationService.js';
import {
  notifyPaymentReceived,
  notifyPaymentFailed,
} from '../utils/adminNotificationService.js';

// ---------- Idempotency (Lock-based, two-phase) ----------
const IDEMPOTENT_KEY_PREFIX = 'payments:processed:'; // durable marker
const LOCK_KEY_PREFIX = 'payments:lock:';            // short-lived lock
const IDEMPOTENT_TTL_SEC = 7 * 24 * 3600;            // 7 days
const LOCK_TTL_SEC = 60;                             // 60 seconds processing window

async function wasAlreadyProcessed(id: string): Promise<boolean> {
  // Check if durable marker exists (read-only)
  const exists = await redis.exists(`${IDEMPOTENT_KEY_PREFIX}${id}`);
  return exists === 1;
}

async function acquireProcessingLock(id: string): Promise<boolean> {
  // Try to acquire short-lived processing lock
  const lockKey = `${LOCK_KEY_PREFIX}${id}`;
  const acquired = await redis.set(lockKey, '1', 'EX', LOCK_TTL_SEC, 'NX');
  return acquired === 'OK';
}

async function releaseProcessingLock(id: string): Promise<void> {
  // Release lock on failure so retries can proceed
  const lockKey = `${LOCK_KEY_PREFIX}${id}`;
  await redis.del(lockKey);
}

async function markAsProcessed(id: string): Promise<void> {
  // Write durable processed marker ONLY after successful handling
  await redis.set(
    `${IDEMPOTENT_KEY_PREFIX}${id}`,
    '1',
    'EX', IDEMPOTENT_TTL_SEC
  );
}

// ---------- Utils ----------
function toNGN(amountKobo?: number) {
  return typeof amountKobo === 'number' ? Math.round(amountKobo) / 100 : undefined;
}

// Get human-readable reason for failed payments
function getFailureReason(paystackStatus: string): string {
  switch (paystackStatus) {
    case 'declined':
      return 'Payment declined by bank';
    case 'abandoned':
      return 'Payment abandoned by customer';
    case 'failed':
      return 'Payment failed';
    case 'reversed':
      return 'Payment reversed';
    default:
      return `Payment status: ${paystackStatus}`;
  }
}

// Check if payment is successful
function isSuccessStatus(status: string): boolean {
  return status === 'success';
}

// Check if payment is failed/declined
function isFailedStatus(status: string): boolean {
  return ['failed', 'declined', 'abandoned'].includes(status);
}

// Check if payment is refunded/reversed
function isRefundedStatus(status: string): boolean {
  return ['refunded', 'reversed'].includes(status);
}

async function handleSuccess(order: any) {
  const firstTime = !order.isPaid;
  if (firstTime) {
    order.isPaid = true;
    order.paidAt = new Date();
  }
  order.paymentStatus = 'success';
  if (order.status === 'New') order.status = 'Processing';
  await order.save();

  // Only send email/notifications on first successful payment
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
      order.paymentMethod || 'paystack',
      order.currency || 'NGN'
    );
    await notifyPaymentReceived(
      order._id.toString(),
      order.totalAmount,
      order.paymentMethod || 'paystack',
      (user as any)?.name || 'Unknown Customer'
    );
  }
}

async function handleFailed(order: any, paystackStatus: string) {
  if (!order.isPaid) {
    order.paymentStatus = paystackStatus; // Use actual Paystack status
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
      order.paymentMethod || 'paystack',
      getFailureReason(paystackStatus),
      order.currency || 'NGN'
    );
    await notifyPaymentFailed(
      order._id.toString(),
      order.totalAmount,
      order.paymentMethod || 'paystack',
      getFailureReason(paystackStatus),
      (user as any)?.name || 'Unknown Customer'
    );
  }
}

async function upsertTransaction(trxData: any, orderId?: string) {
  // Normalize status: Paystack uses 'success', our DB uses 'successful'
  const normalizedStatus = trxData.status === 'success' ? 'successful' : trxData.status;

  const existingTrx = await Transaction.findOne({ transactionId: trxData.id });

  if (existingTrx) {
    // Update existing transaction status if changed
    if (existingTrx.status !== normalizedStatus) {
      await existingTrx.updateStatus(normalizedStatus);
    }
    // Add order reference if not already set
    if (orderId && !existingTrx.order) {
      existingTrx.order = orderId as any;
      await existingTrx.save();
    }
    return existingTrx;
  }

  // Create new transaction with all data
  return Transaction.create({
    transactionId: trxData.id,
    amount: toNGN(trxData.amount),
    currency: trxData.currency,
    reference: trxData.reference,
    customer: {
      id: trxData.customer?.id,
      first_name: trxData.customer?.first_name,
      last_name: trxData.customer?.last_name,
      email: trxData.customer?.email,
    },
    paidAt: trxData.paid_at,
    status: normalizedStatus,
    statusHistory: [{ status: normalizedStatus, changedAt: new Date() }],
    order: orderId,
  });
}

// ---------- Worker ----------
export const { worker: paymentWorker } = makeWorker(
  'payment',
  async (job) => {
    if (job.name === 'verify_payment') {
      // VERIFY path (from GET /verify)
      const d = job.data as PaymentVerifyJob;
      const idKey = `${d.provider}:payment:${d.reference}`;

      // 1. Check durable marker first (fast path)
      if (await wasAlreadyProcessed(idKey)) {
        return { skipped: 'already_processed' };
      }

      // 2. Try to acquire processing lock
      if (!(await acquireProcessingLock(idKey))) {
        // Another worker is processing this right now
        throw new Error('Lock acquisition failed - another worker processing');
      }

      try {
        // 3. Double-check after acquiring lock (another worker might have finished)
        if (await wasAlreadyProcessed(idKey)) {
          await releaseProcessingLock(idKey);
          return { skipped: 'already_processed' };
        }

        // 4. Do the actual work
        const verifyResp: any = await paystack.verify(d.reference);
        const trx = verifyResp.data;

        const order = await Order.findOne({ paystackReference: d.reference });
        if (!order) {
          // Save transaction even if order not found
          await upsertTransaction(trx);
          await releaseProcessingLock(idKey);
          return { ignored: 'order_not_found' };
        }

        // Save transaction with order reference (saves ALL transactions regardless of status)
        await upsertTransaction(trx, order._id.toString());

        const expectedKobo = Math.round((order.amountAtPayment ?? order.totalAmount) * 100);
        const currency = order.currency || 'NGN';
        const paystackStatus = trx.status;

        if (isSuccessStatus(paystackStatus) && trx.amount === expectedKobo && trx.currency === currency) {
          await handleSuccess(order);
        } else if (isFailedStatus(paystackStatus) && !order.isPaid) {
          await handleFailed(order, paystackStatus);
        } else if (isRefundedStatus(paystackStatus)) {
          order.paymentStatus = paystackStatus;
          await order.save();
        }

        // 5. Mark as processed (durable marker)
        await markAsProcessed(idKey);

        // 6. Release lock
        await releaseProcessingLock(idKey);

        return { verified: true, status: order.paymentStatus };

      } catch (error) {
        // On failure, release lock so retries can happen
        await releaseProcessingLock(idKey);
        throw error;
      }
    }

    // WEBHOOK/EVENT path
    const d = job.data as PaymentEventJob;
    const idKey = `${d.provider}:payment:${d.reference}`;

    console.log(`[PaymentWorker] Processing webhook event: ${d.eventType} for reference: ${d.reference}`);

    // 1. Check durable marker first (fast path)
    if (await wasAlreadyProcessed(idKey)) {
      console.log(`[PaymentWorker] Skipping already processed payment: ${d.reference}`);
      return { skipped: 'already_processed' };
    }

    // 2. Try to acquire processing lock
    if (!(await acquireProcessingLock(idKey))) {
      // Another worker is processing this right now
      throw new Error('Lock acquisition failed - another worker processing');
    }

    try {
      // 3. Double-check after acquiring lock (another worker might have finished)
      if (await wasAlreadyProcessed(idKey)) {
        await releaseProcessingLock(idKey);
        return { skipped: 'already_processed' };
      }

      // 4. Do the actual work
      // Single source of truth: verify with provider
      const verifyResp: any = await paystack.verify(d.reference);
      const trxData = verifyResp.data;

      // Update order if present
      const order = await Order.findOne({ paystackReference: d.reference });
      console.log(`[PaymentWorker] Order lookup for reference ${d.reference}:`, order ? `Found order ${order._id}` : 'Order not found');

      // Save transaction with order reference (saves ALL transactions regardless of status)
      await upsertTransaction(trxData, order?._id.toString());

      if (order) {
        const paystackStatus = trxData.status;
        console.log(`[PaymentWorker] Processing payment status: ${paystackStatus} for order ${order._id}`);

        if (isSuccessStatus(paystackStatus)) {
          console.log(`[PaymentWorker] Marking order ${order._id} as successful`);
          await handleSuccess(order);
        } else if (isFailedStatus(paystackStatus)) {
          console.log(`[PaymentWorker] Marking order ${order._id} as failed (${paystackStatus})`);
          await handleFailed(order, paystackStatus);
        } else if (isRefundedStatus(paystackStatus)) {
          order.paymentStatus = paystackStatus;
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
        } else {
          // For pending/ongoing/queued or any other status, store as-is
          order.paymentStatus = paystackStatus;
          await order.save();
        }
      }

      // 5. Mark as processed (durable marker)
      await markAsProcessed(idKey);

      // 6. Release lock
      await releaseProcessingLock(idKey);

      return { processed: d.eventType };

    } catch (error) {
      // On failure, release lock so retries can happen
      await releaseProcessingLock(idKey);
      throw error;
    }
  },
  { concurrency: 10 }
);
