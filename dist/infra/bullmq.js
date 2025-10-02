// src/infra/queues.ts (or wherever you defined makeQueue/makeWorker)
import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from '../config/redis.js';
export const defaultJobOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400 },
};
export function makeQueue(name, overrides) {
    return new Queue(name, {
        connection: redis, // ✅ shared client
        defaultJobOptions: { ...defaultJobOptions, ...(overrides?.defaultJobOptions ?? {}) },
    });
}
export function makeWorker(name, processor, opts = {}) {
    const worker = new Worker(name, processor, {
        connection: redis, // ✅ shared client
        ...opts,
    });
    const events = new QueueEvents(name, { connection: redis }); // ✅ shared client
    worker.on('completed', (job) => console.log(`[${name}] completed ${job.id}`));
    worker.on('failed', (job, err) => console.error(`[${name}] failed ${job?.id}: ${err?.message}`));
    return { worker, events };
}
