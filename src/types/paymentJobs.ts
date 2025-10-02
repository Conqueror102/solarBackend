export type PaymentProvider = 'paystack';

export type PaymentEventType =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_refunded'
  | 'payment_dispute'
  | 'payment_settlement';

export interface PaymentEventJob {
  provider: PaymentProvider;           // 'paystack'
  eventType: PaymentEventType;         // normalized event
  eventId: string;                     // paystack event id or reference
  reference: string;                   // paystack reference
  orderId?: string;                    // your order id (if known)
  amount?: number;                     // major units (NGN)
  currency?: string;                   // 'NGN'
  customerEmail?: string;
  customerName?: string;
  raw?: Record<string, unknown>;       // full webhook payload (optional)
}

export interface PaymentVerifyJob {
  provider: PaymentProvider;           // 'paystack'
  reference: string;                   // reference to verify
}
