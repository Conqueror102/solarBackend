// src/queues/producers/emailProducers.ts
import crypto from 'node:crypto';
import { emailQueue } from '../emailQueue.js';
import type { EmailOrderPlacedJob, EmailOrderStatusJob } from '../../types/orderJobs.js';

const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex');

export async function enqueueEmailOrderPlaced(job: EmailOrderPlacedJob & { dedupeKey?: string }) {
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

export async function enqueueEmailOrderStatusUpdate(job: EmailOrderStatusJob & { dedupeKey?: string }) {
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

export async function enqueueEmailVerification(payload: {
  to: string; userName?: string; token: string; frontendUrl: string; userId: string;
}) {
  const jobId = hash(`verify_${payload.userId}_${payload.token}`);
  await emailQueue.add('authEmailVerification', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function enqueuePasswordResetEmail(payload: {
  to: string; userName?: string; token: string; frontendUrl: string; userId: string;
}) {
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
export async function enqueueCustomEmail(payload: {
  to: string | string[];
  subject: string;
  html: string;
  dedupeKey?: string;
}) {
  const jobId = payload.dedupeKey ? hash(payload.dedupeKey) : undefined;
  await emailQueue.add('customEmail', payload, {
    jobId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1500 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}