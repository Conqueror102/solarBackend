// src/queues/producers/userNotificationProducers.ts
import crypto from 'node:crypto';
import { userNotificationQueue } from '../userNotificationQueue.js';
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');
export async function enqueueUserOrderStatusNotification(job) {
    const jobId = job.dedupeKey ?? hash(`usernotif:status:${job.userId}:${job.orderId}:${job.status}`);
    await userNotificationQueue.add('orderStatus', job, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
