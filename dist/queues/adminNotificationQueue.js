import { makeQueue } from '../infra/bullmq.js';
export const adminNotificationQueue = makeQueue('admin-notifications');
