import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

const {
  NODE_ENV,
  SENDGRID_API_KEY,
  SENDGRID_SENDER_EMAIL,
  SENDGRID_SENDER_NAME,
} = process.env;

// --- SendGrid SDK configuration ---
sgMail.setApiKey(SENDGRID_API_KEY || '');

// --- Core mail sender using SendGrid ---
async function sendMail(to: string | string[], subject: string, html: string) {
  try {
    const recipients = Array.isArray(to) ? to : [to];

    const msg = {
      to: recipients,
      from: {
        name: SENDGRID_SENDER_NAME || 'Solar Store',
        email: SENDGRID_SENDER_EMAIL || '',
      },
      subject,
      html,
    };

    const result = await sgMail.send(msg);
    return result;
  } catch (error: any) {
    console.error('❌ Email failed:', {
      to,
      subject,
      error: error.message,
      code: error.code,
      response: error.response?.body,
      status: error.response?.statusCode,
    });

    if (NODE_ENV === 'production') {
      console.warn('⚠️ Email error ignored in production');
      return null;
    } else {
      throw error;
    }
  }
}

// --- Order + stock helpers ---
interface UserInfo {
  email: string;
  name?: string;
}

interface OrderInfo {
  _id: string;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
}

const orderStatusMessages: Record<string, string> = {
  New: 'Your order has been received.',
  Processing: 'Your order is currently being processed.',
  Shipped: 'Good news! Your order has been shipped.',
  Delivered: 'Your order has been delivered. Thank you for shopping with us!',
  Cancelled:
    'Your order has been cancelled. If you have questions, please contact support.',
};

const paymentStatusMessages: Record<string, string> = {
  Pending: 'Your payment is pending.',
  Processing: 'Your payment is being processed.',
  Completed: 'Your payment has been successfully completed.',
  Failed: 'Your payment attempt failed. Please try again.',
  Refunded: 'Your payment has been refunded.',
};

// --- Order confirmation ---
export async function sendOrderPlacedEmail(user: UserInfo, order: OrderInfo) {
  const html = `
    <h2>Thank you for your order, ${user.name || ''}!</h2>
    <p>Your order <b>#${order._id.slice(-5)}</b> has been placed successfully.</p>
    <p>Total Amount: <b>₦${order.totalAmount.toFixed(2)}</b></p>
    <p>Status: <b>${order.status}</b></p>
  `;
  return sendMail(user.email, 'Order Confirmation', html);
}

// --- Order status update ---
export async function sendOrderStatusUpdateEmail(
  user: UserInfo,
  order: OrderInfo
) {
  const statusMsg =
    orderStatusMessages[order.status] ||
    `Your order status is now: ${order.status}`;
  const html = `
    <h2>Order Status Update</h2>
    <p>Order <b>#${order._id.slice(-5)}</b> is now <b>${order.status}</b>.</p>
    <p>${statusMsg}</p>
  `;
  return sendMail(user.email, 'Order Status Updated', html);
}

// --- Low stock alert ---
export async function sendLowStockEmail(
  adminEmails: string[],
  lowStockProducts: { name: string; stock: number }[]
) {
  const productList = lowStockProducts
    .map((p) => `<li>${p.name}: <b>${p.stock}</b> left</li>`)
    .join('');
  const html = `
    <h2>Low Stock Alert</h2>
    <p>The following products are low in stock:</p>
    <ul>${productList}</ul>
  `;
  return sendMail(adminEmails, 'Low Stock Alert', html);
}

// --- Custom single/bulk email ---
export async function sendCustomEmail(
  to: string | string[],
  subject: string,
  html: string
) {
  return sendMail(to, subject, html);
}

// --- Daily report ---
export async function sendDailySalesReportEmail(to: string[], html: string) {
  return sendMail(to, 'Daily Sales Report', html);
}

// --- Background SendGrid API key verification (non-blocking) ---
(async () => {
  try {
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not set');
    }
    // SendGrid SDK initialized - no test email sent
  } catch (err: any) {
    console.warn('⚠️ SendGrid SDK verification failed:', err.message);
  }
})();

export { sendMail, sgMail };
