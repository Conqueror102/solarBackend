import { makeQueue } from '../infra/bullmq.js';
export const paymentQueue = makeQueue('payment');
