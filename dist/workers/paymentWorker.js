import { makeWorker } from '../infra/bullmq.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import Transaction from '../models/transaction.history.js';
import * as paystack from '../services/paystack.service.js';
import { redis } from '../config/redis.js';
// helpers
import { sendOrderStatusUpdateEmail } from '../utils/email.js';
import { createPaymentSuccessNotification, createPaymentFailedNotification, } from '../utils/notificationService.js';
import { notifyPaymentReceived, notifyPaymentFailed, } from '../utils/adminNotificationService.js';
// ---------- Idempotency (Lock-based, two-phase) ----------
const IDEMPOTENT_KEY_PREFIX = 'payments:processed:'; // durable marker
const LOCK_KEY_PREFIX = 'payments:lock:'; // short-lived lock
const IDEMPOTENT_TTL_SEC = 7 * 24 * 3600; // 7 days
const LOCK_TTL_SEC = 60; // 60 seconds processing window
async function wasAlreadyProcessed(id) {
    // Check if durable marker exists (read-only)
    const exists = await redis.exists(`${IDEMPOTENT_KEY_PREFIX}${id}`);
    return exists === 1;
}
async function acquireProcessingLock(id) {
    // Try to acquire short-lived processing lock
    const lockKey = `${LOCK_KEY_PREFIX}${id}`;
    const acquired = await redis.set(lockKey, '1', 'EX', LOCK_TTL_SEC, 'NX');
    return acquired === 'OK';
}
async function releaseProcessingLock(id) {
    // Release lock on failure so retries can proceed
    const lockKey = `${LOCK_KEY_PREFIX}${id}`;
    await redis.del(lockKey);
}
async function markAsProcessed(id) {
    // Write durable processed marker ONLY after successful handling
    await redis.set(`${IDEMPOTENT_KEY_PREFIX}${id}`, '1', 'EX', IDEMPOTENT_TTL_SEC);
}
// ---------- Utils ----------
function toNGN(amountKobo) {
    return typeof amountKobo === 'number' ? Math.round(amountKobo) / 100 : undefined;
}
async function handleSuccess(order) {
    const firstTime = !order.isPaid;
    if (firstTime) {
        order.isPaid = true;
        order.paidAt = new Date();
    }
    order.paymentStatus = 'Completed';
    if (order.status === 'New')
        order.status = 'Processing';
    await order.save();
    // Only send email/notifications on first successful payment
    if (firstTime) {
        const user = await User.findById(order.user);
        if (user?.email) {
            await sendOrderStatusUpdateEmail({ email: user.email, name: user.name }, {
                _id: order._id.toString(),
                totalAmount: order.totalAmount,
                status: order.status,
                paymentStatus: order.paymentStatus,
            });
        }
        await createPaymentSuccessNotification(order.user.toString(), order._id.toString(), order.totalAmount, order.paymentMethod || 'paystack', order.currency || 'NGN');
        await notifyPaymentReceived(order._id.toString(), order.totalAmount, order.paymentMethod || 'paystack', user?.name || 'Unknown Customer');
    }
}
async function handleFailed(order, reason) {
    if (!order.isPaid) {
        order.paymentStatus = 'Failed';
        await order.save();
        const user = await User.findById(order.user);
        if (user?.email) {
            await sendOrderStatusUpdateEmail({ email: user.email, name: user.name }, {
                _id: order._id.toString(),
                totalAmount: order.totalAmount,
                status: order.status,
                paymentStatus: order.paymentStatus,
            });
        }
        await createPaymentFailedNotification(order.user.toString(), order._id.toString(), order.totalAmount, order.paymentMethod || 'paystack', reason, order.currency || 'NGN');
        await notifyPaymentFailed(order._id.toString(), order.totalAmount, order.paymentMethod || 'paystack', reason, user?.name || 'Unknown Customer');
    }
}
async function upsertTransaction(trxData) {
    // Normalize status: Paystack uses 'success', our DB uses 'successful'
    const normalizedStatus = trxData.status === 'success' ? 'successful' : trxData.status;
    return Transaction.findOneAndUpdate({ transactionId: trxData.id }, {
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
            status: normalizedStatus,
        },
    }, { upsert: true, new: true });
}
// ---------- Worker ----------
export const { worker: paymentWorker } = makeWorker('payment', async (job) => {
    if (job.name === 'verify_payment') {
        // VERIFY path (from GET /verify)
        const d = job.data;
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
            const verifyResp = await paystack.verify(d.reference);
            const trx = verifyResp.data;
            const order = await Order.findOne({ paystackReference: d.reference });
            if (!order) {
                await releaseProcessingLock(idKey);
                return { ignored: 'order_not_found' };
            }
            const expectedKobo = Math.round((order.amountAtPayment ?? order.totalAmount) * 100);
            const currency = order.currency || 'NGN';
            if (trx.status === 'success' && trx.amount === expectedKobo && trx.currency === currency) {
                await handleSuccess(order);
            }
            else if ((trx.status === 'failed' || trx.status === 'abandoned') && !order.isPaid) {
                await handleFailed(order, trx.status === 'failed' ? 'Verification failed' : 'Payment abandoned');
            }
            // 5. Mark as processed (durable marker)
            await markAsProcessed(idKey);
            // 6. Release lock
            await releaseProcessingLock(idKey);
            return { verified: true, status: order.paymentStatus };
        }
        catch (error) {
            // On failure, release lock so retries can happen
            await releaseProcessingLock(idKey);
            throw error;
        }
    }
    // WEBHOOK/EVENT path
    const d = job.data;
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
        // Single source of truth: verify with provider
        const verifyResp = await paystack.verify(d.reference);
        const trxData = verifyResp.data;
        // Upsert transaction (first-time insert keeps status/amount)
        const trxDoc = await upsertTransaction(trxData);
        // Update order if present
        const order = await Order.findOne({ paystackReference: d.reference });
        if (order) {
            // Normalize status: Paystack uses 'success', our DB uses 'successful'
            const normalizedStatus = trxData.status === 'success' ? 'successful' : trxData.status;
            if (normalizedStatus === 'successful') {
                await handleSuccess(order);
            }
            else if (normalizedStatus === 'failed') {
                await handleFailed(order, 'failed');
            }
            else if (normalizedStatus === 'refunded') {
                order.paymentStatus = 'Refunded';
                await order.save();
                const user = await User.findById(order.user);
                if (user?.email) {
                    await sendOrderStatusUpdateEmail({ email: user.email, name: user.name }, {
                        _id: order._id.toString(),
                        totalAmount: order.totalAmount,
                        status: order.status,
                        paymentStatus: order.paymentStatus,
                    });
                }
            }
        }
        // 5. Mark as processed (durable marker)
        await markAsProcessed(idKey);
        // 6. Release lock
        await releaseProcessingLock(idKey);
        return { processed: d.eventType };
    }
    catch (error) {
        // On failure, release lock so retries can happen
        await releaseProcessingLock(idKey);
        throw error;
    }
}, { concurrency: 10 });
