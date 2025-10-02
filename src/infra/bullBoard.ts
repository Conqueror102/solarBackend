// src/infra/bullBoard.ts
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { emailQueue } from '../queues/emailQueue.js';
import { adminNotificationQueue } from '../queues/adminNotificationQueue.js';
import { userNotificationQueue } from '../queues/userNotificationQueue.js';
import { paymentQueue } from '../queues/paymentQueue.js';

import '../workers/index.js';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(adminNotificationQueue),
    new BullMQAdapter(userNotificationQueue),
    new BullMQAdapter(paymentQueue),
  ],
  serverAdapter,
});

export const bullBoardRouter = serverAdapter.getRouter();
