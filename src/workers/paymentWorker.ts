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

// ---------- Idempotency (TTL-based, atomic) ----------
const IDEMPOTENT_KEY_PREFIX = 'payments:processed:'; // key per event
const IDEMPOTENT_TTL_SEC = 7 * 24 * 3600;            // 7 days

async function alreadyProcessed(id: string) {
  // SET NX EX is atomic: returns 'OK' if set, null if existed
  const ok = await redis.set(
    `${IDEMPOTENT_KEY_PREFIX}${id}`,
    '1',
    'EX', IDEMPOTENT_TTL_SEC,
    'NX'
  );
  return !ok; // null => already processed
}
// markProcessed no longer needed with the pattern above
async function markProcessed(_: string) { /* no-op */ }

// ---------- Utils ----------
function toNGN(amountKobo?: number) {
  return typeof amountKobo === 'number' ? Math.round(amountKobo) / 100 : undefined;
}

async function handleSuccess(order: any) {
  const firstTime = !order.isPaid;
  if (firstTime) {
    order.isPaid = true;
    order.paidAt = new Date();
  }
  order.paymentStatus = 'Completed';
  if (order.status === 'New') order.status = 'Processing';
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
  if (firstTime) {
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

async function handleFailed(order: any, reason: string) {
  if (!order.isPaid) {
    order.paymentStatus = 'Failed';
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
      reason,
      order.currency || 'NGN'
    );
    await notifyPaymentFailed(
      order._id.toString(),
      order.totalAmount,
      order.paymentMethod || 'paystack',
      reason,
      (user as any)?.name || 'Unknown Customer'
    );
  }
}

async function upsertTransaction(trxData: any) {
  return Transaction.findOneAndUpdate(
    { transactionId: trxData.id },
    {
      $setOnInsert: {
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
        status: trxData.status, // keep status for decisions below
      },
    },
    { upsert: true, new: true }
  );
}

// ---------- Worker ----------
export const { worker: paymentWorker } = makeWorker(
  'payment',
  async (job) => {
    if (job.name === 'verify_payment') {
      // VERIFY path (from GET /verify)
      const d = job.data as PaymentVerifyJob;
      const verifyResp: any = await paystack.verify(d.reference);
      const trx = verifyResp.data;

      const order = await Order.findOne({ paystackReference: d.reference });
      if (!order) return { ignored: 'order_not_found' };

      const expectedKobo = Math.round((order.amountAtPayment ?? order.totalAmount) * 100);
      const currency = order.currency || 'NGN';

      if (trx.status === 'success' && trx.amount === expectedKobo && trx.currency === currency) {
        await handleSuccess(order);
      } else if ((trx.status === 'failed' || trx.status === 'abandoned') && !order.isPaid) {
        await handleFailed(order, trx.status === 'failed' ? 'Verification failed' : 'Payment abandoned');
      }

      return { verified: true, status: order.paymentStatus };
    }

    // WEBHOOK/EVENT path
    const d = job.data as PaymentEventJob;
    const idKey = d.eventId || `${d.provider}:${d.reference}:${d.eventType}`;

    if (await alreadyProcessed(idKey)) {
      return { skipped: 'duplicate' };
    }

    // Single source of truth: verify with provider
    const verifyResp: any = await paystack.verify(d.reference);
    const trxData = verifyResp.data;

    // Upsert transaction (first-time insert keeps status/amount)
    const trxDoc = await upsertTransaction(trxData);

    // Update order if present
    const order = await Order.findOne({ paystackReference: d.reference });
    if (order) {
      if (trxDoc.status === 'successful' || trxData.status === 'success') {
        await handleSuccess(order);
      } else if (trxDoc.status === 'failed' || trxData.status === 'failed') {
        await handleFailed(order, 'failed');
      } else if (trxDoc.status === 'refunded' || trxData.status === 'refunded') {
        order.paymentStatus = 'Refunded';
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
      }
    }

    // With SET NX EX above, we already marked it — keep this for clarity/no-op
    await markProcessed(idKey);
    return { processed: d.eventType };
  },
  { concurrency: 20 }
);
