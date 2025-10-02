// src/queues/producers/emailProducers.ts
import crypto from 'node:crypto';
import { emailQueue } from '../emailQueue.js';
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');
export async function enqueueEmailOrderPlaced(job) {
    const jobId = job.dedupeKey
        ? hash(job.dedupeKey)
        : hash(`email_placed_${job.orderId}_${job.to}`);
    await emailQueue.add('orderPlaced', job, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
export async function enqueueEmailOrderStatusUpdate(job) {
    const jobId = job.dedupeKey
        ? hash(job.dedupeKey)
        : hash(`email_status_${job.orderId}_${job.status}_${job.paymentStatus ?? ''}_${job.to}`);
    await emailQueue.add('orderStatus', job, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
export async function enqueueEmailVerification(payload) {
    const jobId = hash(`verify_${payload.userId}_${payload.token}`);
    await emailQueue.add('authEmailVerification', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
export async function enqueuePasswordResetEmail(payload) {
    const jobId = hash(`reset_${payload.userId}_${payload.token}`);
    await emailQueue.add('authPasswordReset', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
/** generic custom email (for admin tool / marketing single-send UI etc.) */
export async function enqueueCustomEmail(payload) {
    const jobId = payload.dedupeKey ? hash(payload.dedupeKey) : undefined;
    await emailQueue.add('customEmail', payload, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1500 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
