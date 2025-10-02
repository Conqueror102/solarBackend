// src/workers/userNotificationsWorker.ts
import { makeWorker } from '../infra/bullmq.js';
import { createOrderStatusNotification } from '../utils/notificationService.js';
export const { worker: userNotificationsWorker } = makeWorker('user-notifications', async (job) => {
    if (job.name === 'orderStatus') {
        const d = job.data;
        await createOrderStatusNotification(d.userId, d.orderId, d.status, d.extra);
        return { created: true };
    }
    throw new Error(`Unknown user notification job: ${job.name}`);
}, { concurrency: 50 });
