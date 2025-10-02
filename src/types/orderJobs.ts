// src/types/orderJobs.ts
export type EmailOrderPlacedJob = {
    to: string;
    userName?: string;
    orderId: string;
    totalAmount: number;
    status: string;
  };
  
  export type EmailOrderStatusJob = {
    to: string;
    userName?: string;
    orderId: string;
    totalAmount: number;
    status: string;
    paymentStatus?: string;
  };
  
  export type AdminNewOrderJob = {
    orderId: string;
    orderAmount: number;
    customerName: string;
    customerEmail: string;
  };
  
  export type AdminOrderStatusChangedJob = {
    orderId: string;
    oldStatus: string;
    newStatus: string;
    orderAmount: number;
    customerName: string;
  };
  
  export type UserOrderStatusJob = {
    userId: string;
    orderId: string;
    status: string;
    extra?: Record<string, unknown>;
  };
  