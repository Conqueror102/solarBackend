import crypto from 'node:crypto';
import { paymentQueue } from '../paymentQueue.js';
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');
export async function enqueuePaymentEvent(job) {
    const stableKey = job.dedupeKey ?? (job.eventId || `${job.provider}:${job.reference}:${job.eventType}`);
    const jobId = hash(stableKey);
    await paymentQueue.add(job.eventType, job, { jobId });
}
export async function enqueuePaymentVerify(job) {
    const stableKey = job.dedupeKey ?? `${job.provider}:verify:${job.reference}`;
    const jobId = hash(stableKey);
    await paymentQueue.add('verify_payment', job, { jobId, attempts: 5, backoff: { type: 'exponential', delay: 1000 } });
}
