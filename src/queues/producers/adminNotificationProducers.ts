
import crypto from 'node:crypto';
import { adminNotificationQueue } from '../adminNotificationQueue.js';
import type { AdminNewOrderJob, AdminOrderStatusChangedJob } from '../../types/orderJobs.js';

const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex');

export async function enqueueAdminNewOrderPlaced(job: AdminNewOrderJob & { dedupeKey?: string }) {
  const stableKey = job.dedupeKey ?? `admin:neworder:${job.orderId}`;
  const jobId = hash(stableKey);
  await adminNotificationQueue.add('newOrderPlaced', job, { jobId });
}

export async function enqueueAdminOrderStatusChanged(job: AdminOrderStatusChangedJob & { dedupeKey?: string }) {
  const stableKey = job.dedupeKey ?? `admin:status:${job.orderId}:${job.oldStatus}->${job.newStatus}`;
  const jobId = hash(stableKey);
  await adminNotificationQueue.add('orderStatusChanged', job, { jobId });
}


export async function enqueueAdminNewUserRegistration(payload: {
  userId: string;
  userName: string;
  userEmail: string;
}) {
  const jobId = hash(`admin:new_user:${payload.userId}`);
  await adminNotificationQueue.add('admin.new_user_registration', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function enqueueAdminUserActivity(payload: {
  activityType: string;          // e.g. 'user_updated', 'user_deactivated'
  userName?: string;
  userEmail?: string;
  details?: string;
  changes?: string[];
  dedupeKey?: string;
}) {
  const jobId = payload.dedupeKey ? hash(`admin_activity_${payload.dedupeKey}`) : undefined;
  await adminNotificationQueue.add('admin.user_activity', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}


// PRODUCT EVENTS
export async function enqueueAdminProductAdded(payload: {
  productId: string;
  productName: string;
  addedBy?: string;
}) {
  const jobId = hash(`admin_product_added_${payload.productId}`);
  await adminNotificationQueue.add('admin.product_added', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function enqueueAdminProductUpdated(payload: {
  productId: string;
  productName: string;
  updatedBy?: string;
  changes?: string[];
}) {
  const key = `${payload.productId}:${(payload.changes || []).join('|')}`;
  const jobId = hash(`admin_product_updated_${key}`);
  await adminNotificationQueue.add('admin.product_updated', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function enqueueAdminLowStockAlert(payload: {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}) {
  const jobId = hash(`admin_low_stock_${payload.productId}_${payload.currentStock}`);
  await adminNotificationQueue.add('admin.low_stock_alert', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function enqueueAdminOutOfStockAlert(payload: {
  productId: string;
  productName: string;
}) {
  const jobId = hash(`admin_out_of_stock_${payload.productId}`);
  await adminNotificationQueue.add('admin.out_of_stock_alert', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}




/**
 * Enqueue: admin.brand_added
 */
export async function enqueueAdminBrandAdded(payload: {
  brandId: string;
  brandName: string;
  addedBy?: string;
}) {
  const jobId = hash(`admin_brand_added_${payload.brandId}`);
  await adminNotificationQueue.add('admin.brand_added', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

/**
 * Enqueue: admin.brand_updated
 */
export async function enqueueAdminBrandUpdated(payload: {
  brandId: string;
  oldBrandName: string;
  newBrandName: string;
  updatedBy?: string;
  changes?: string[]; // optional audit of changed fields
}) {
  const key = `${payload.brandId}:${payload.oldBrandName}->${payload.newBrandName}:${(payload.changes || []).join('|')}`;
  const jobId = hash(`admin_brand_updated_${key}`);
  await adminNotificationQueue.add('admin.brand_updated', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

/**
 * Enqueue: admin.brand_deleted
 */
export async function enqueueAdminBrandDeleted(payload: {
  brandId: string;
  brandName: string;
  deletedBy?: string;
}) {
  const jobId = hash(`admin_brand_deleted_${payload.brandId}`);
  await adminNotificationQueue.add('admin.brand_deleted', payload, {
    jobId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}
