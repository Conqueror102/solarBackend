import { makeQueue } from '../infra/bullmq.js';
export const userNotificationQueue = makeQueue('user-notifications');
