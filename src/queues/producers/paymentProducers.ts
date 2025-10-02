import crypto from 'node:crypto';
import { paymentQueue } from '../paymentQueue.js';
import type { PaymentEventJob, PaymentVerifyJob } from '../../types/paymentJobs.js';

const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex');

export async function enqueuePaymentEvent(job: PaymentEventJob & { dedupeKey?: string }) {
  const stableKey = job.dedupeKey ?? (job.eventId || `${job.provider}:${job.reference}:${job.eventType}`);
  const jobId = hash(stableKey);
  await paymentQueue.add(job.eventType, job, { jobId });
}

export async function enqueuePaymentVerify(job: PaymentVerifyJob & { dedupeKey?: string }) {
  const stableKey = job.dedupeKey ?? `${job.provider}:verify:${job.reference}`;
  const jobId = hash(stableKey);
  await paymentQueue.add('verify_payment', job, { jobId, attempts: 5, backoff: { type: 'exponential', delay: 1000 } });
}
