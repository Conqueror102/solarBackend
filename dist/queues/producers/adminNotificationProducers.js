import crypto from 'node:crypto';
import { adminNotificationQueue } from '../adminNotificationQueue.js';
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');
export async function enqueueAdminNewOrderPlaced(job) {
    const jobId = job.dedupeKey ?? hash(`admin:neworder:${job.orderId}`);
    await adminNotificationQueue.add('newOrderPlaced', job, { jobId });
}
export async function enqueueAdminOrderStatusChanged(job) {
    const jobId = job.dedupeKey ?? hash(`admin:status:${job.orderId}:${job.oldStatus}->${job.newStatus}`);
    await adminNotificationQueue.add('orderStatusChanged', job, { jobId });
}
export async function enqueueAdminNewUserRegistration(payload) {
    const jobId = hash(`admin:new_user:${payload.userId}`);
    await adminNotificationQueue.add('admin.new_user_registration', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
export async function enqueueAdminUserActivity(payload) {
    const jobId = payload.dedupeKey ? hash(`admin:activity:${payload.dedupeKey}`) : undefined;
    await adminNotificationQueue.add('admin.user_activity', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
// PRODUCT EVENTS
export async function enqueueAdminProductAdded(payload) {
    const jobId = hash(`admin:product_added:${payload.productId}`);
    await adminNotificationQueue.add('admin.product_added', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
export async function enqueueAdminProductUpdated(payload) {
    const key = `${payload.productId}:${(payload.changes || []).join('|')}`;
    const jobId = hash(`admin:product_updated:${key}`);
    await adminNotificationQueue.add('admin.product_updated', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
export async function enqueueAdminLowStockAlert(payload) {
    const jobId = hash(`admin:low_stock:${payload.productId}:${payload.currentStock}`);
    await adminNotificationQueue.add('admin.low_stock_alert', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
export async function enqueueAdminOutOfStockAlert(payload) {
    const jobId = hash(`admin:out_of_stock:${payload.productId}`);
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
export async function enqueueAdminBrandAdded(payload) {
    const jobId = hash(`admin:brand_added:${payload.brandId}`);
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
export async function enqueueAdminBrandUpdated(payload) {
    const key = `${payload.brandId}:${payload.oldBrandName}->${payload.newBrandName}:${(payload.changes || []).join('|')}`;
    const jobId = hash(`admin:brand_updated:${key}`);
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
export async function enqueueAdminBrandDeleted(payload) {
    const jobId = hash(`admin:brand_deleted:${payload.brandId}`);
    await adminNotificationQueue.add('admin.brand_deleted', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
