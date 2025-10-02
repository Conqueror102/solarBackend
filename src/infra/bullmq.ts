// src/infra/queues.ts (or wherever you defined makeQueue/makeWorker)
import { Queue, Worker, QueueEvents, JobsOptions, WorkerOptions, Processor } from 'bullmq';
import { redis } from '../config/redis.js';

export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 86400 },
};

export function makeQueue(name: string, overrides?: { defaultJobOptions?: JobsOptions }) {
  return new Queue(name, {
    connection: redis, // ✅ shared client
    defaultJobOptions: { ...defaultJobOptions, ...(overrides?.defaultJobOptions ?? {}) },
  });
}

export function makeWorker<Data = any>(
  name: string,
  processor: Processor<Data>,
  opts: Omit<WorkerOptions, 'connection'> = {}
) {
  const worker = new Worker<Data>(name, processor, {
    connection: redis, // ✅ shared client
    ...opts,
  });

  const events = new QueueEvents(name, { connection: redis }); // ✅ shared client

  worker.on('completed', (job) => console.log(`[${name}] completed ${job.id}`));
  worker.on('failed', (job, err) => console.error(`[${name}] failed ${job?.id}: ${err?.message}`));

  return { worker, events };
}
