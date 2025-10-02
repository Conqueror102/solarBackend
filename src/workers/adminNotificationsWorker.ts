// src/workers/adminNotificationsWorker.ts
import { makeWorker } from '../infra/bullmq.js';
import type { AdminNewOrderJob, AdminOrderStatusChangedJob } from '../types/orderJobs.js';
import {
  notifyNewOrderPlaced,
  notifyOrderStatusChanged,
  notifyNewUserRegistration,
  notifyUserActivity,
  notifyProductAdded,
  notifyProductUpdated,
  notifyLowStockAlert,
  notifyOutOfStockAlert,
  notifyBrandAdded,
  notifyBrandUpdated,
  notifyBrandDeleted,
} from '../utils/adminNotificationService.js';

export const { worker: adminNotificationsWorker } = makeWorker(
  'admin-notifications',
  async (job) => {
    switch (job.name) {
      case 'newOrderPlaced': {
        const d = job.data as AdminNewOrderJob;
        await notifyNewOrderPlaced(d.orderId, d.orderAmount, d.customerName, d.customerEmail);
        return { notified: true };
      }

      case 'orderStatusChanged': {
        const d = job.data as AdminOrderStatusChangedJob;
        await notifyOrderStatusChanged(d.orderId, d.oldStatus, d.newStatus, d.orderAmount, d.customerName);
        return { notified: true };
      }

      case 'admin.new_user_registration': {
        const d = job.data as { userId: string; userName: string; userEmail: string };
        await notifyNewUserRegistration(d.userId, d.userName, d.userEmail);
        return { notified: true };
      }

      case 'admin.user_activity': {
        const d = job.data as {
          activityType: string;
          userName?: string;
          userEmail?: string;
          details?: string;
          // changes?: string[]; // your service doesn't accept this; ignored here
        };
        await notifyUserActivity(d.activityType, d.userName ?? 'System', d.userEmail ?? '', d.details ?? '');
        return { notified: true };
      }

      // ---------- Product events ----------
      case 'admin.product_added': {
        const d = job.data as { productId: string; productName: string; addedBy?: string };
        await notifyProductAdded(d.productId, d.productName, d.addedBy ?? 'System');
        return { notified: true };
      }

      case 'admin.product_updated': {
        const d = job.data as { productId: string; productName: string; updatedBy?: string; changes?: string[] };
        await notifyProductUpdated(d.productId, d.productName, d.updatedBy ?? 'System', d.changes ?? []);
        return { notified: true };
      }

      case 'admin.low_stock_alert': {
        const d = job.data as { productId: string; productName: string; currentStock: number; threshold: number };
        await notifyLowStockAlert(d.productId, d.productName, d.currentStock, d.threshold);
        return { notified: true };
      }

      case 'admin.out_of_stock_alert': {
        const d = job.data as { productId: string; productName: string };
        await notifyOutOfStockAlert(d.productId, d.productName);
        return { notified: true };
      }

      
case 'admin.brand_added': {
    const d = job.data as { brandId: string; brandName: string; addedBy?: string };
    await notifyBrandAdded(d.brandId, d.brandName, d.addedBy ?? 'System');
    return { notified: true };
  }
  
  case 'admin.brand_updated': {
    const d = job.data as {
      brandId: string;
      oldBrandName: string;
      newBrandName: string;
      updatedBy?: string;
      changes?: string[];
    };
    await notifyBrandUpdated(d.brandId, d.oldBrandName, d.newBrandName, d.updatedBy ?? 'System', d.changes ?? []);
    return { notified: true };
  }
  
  case 'admin.brand_deleted': {
    const d = job.data as { brandId: string; brandName: string; deletedBy?: string };
    await notifyBrandDeleted(d.brandId, d.brandName, d.deletedBy ?? 'System');
    return { notified: true };
  }     

      default:
        throw new Error(`Unknown admin job: ${job.name}`);
    }
  },
  { concurrency: 10 }
);
