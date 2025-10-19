import crypto from 'node:crypto';
import { adminNotificationQueue } from '../adminNotificationQueue.js';
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');
export async function enqueueAdminNewOrderPlaced(job) {
    const stableKey = job.dedupeKey ?? `admin:neworder:${job.orderId}`;
    const jobId = hash(stableKey);
    await adminNotificationQueue.add('newOrderPlaced', job, { jobId });
}
export async function enqueueAdminOrderStatusChanged(job) {
    const stableKey = job.dedupeKey ?? `admin:status:${job.orderId}:${job.oldStatus}->${job.newStatus}`;
    const jobId = hash(stableKey);
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
export async function enqueueAdminProductAdded(payload) {
    const jobId = hash(`admin_product_added_${payload.productId}`);
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
    const jobId = hash(`admin_product_updated_${key}`);
    await adminNotificationQueue.add('admin.product_updated', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
export async function enqueueAdminLowStockAlert(payload) {
    const jobId = hash(`admin_low_stock_${payload.productId}_${payload.currentStock}`);
    await adminNotificationQueue.add('admin.low_stock_alert', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
export async function enqueueAdminOutOfStockAlert(payload) {
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
export async function enqueueAdminBrandAdded(payload) {
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
export async function enqueueAdminBrandUpdated(payload) {
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
export async function enqueueAdminBrandDeleted(payload) {
    const jobId = hash(`admin_brand_deleted_${payload.brandId}`);
    await adminNotificationQueue.add('admin.brand_deleted', payload, {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    });
}
