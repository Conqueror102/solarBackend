
import { makeQueue } from '../infra/bullmq.js';
export const emailQueue = makeQueue('email');
