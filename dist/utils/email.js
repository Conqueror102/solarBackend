import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
const { NODE_ENV, SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT, SMTP_SECURE, } = process.env;
// --- Transporter setup ---
const transporter = nodemailer.createTransport({
    host: SMTP_HOST || 'smtp.gmail.com',
    port: SMTP_PORT ? Number(SMTP_PORT) : 465,
    secure: SMTP_SECURE === 'true' || SMTP_PORT === '465',
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10000, // 10s
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: true },
});
// --- Core mail sender ---
async function sendMail(to, subject, html) {
    try {
        const mailOptions = {
            from: `"Solar Store" <${SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(',') : to,
            subject,
            html,
        };
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent: ${result.messageId}`);
        return result;
    }
    catch (error) {
        console.error('❌ Email failed:', {
            to,
            subject,
            error: error.message,
            code: error.code,
            command: error.command,
        });
        if (NODE_ENV === 'production') {
            console.warn('⚠️ Email error ignored in production');
            return null;
        }
        else {
            throw error;
        }
    }
}
const orderStatusMessages = {
    New: 'Your order has been received.',
    Processing: 'Your order is currently being processed.',
    Shipped: 'Good news! Your order has been shipped.',
    Delivered: 'Your order has been delivered. Thank you for shopping with us!',
    Cancelled: 'Your order has been cancelled. If you have questions, please contact support.',
};
const paymentStatusMessages = {
    Pending: 'Your payment is pending.',
    Processing: 'Your payment is being processed.',
    Completed: 'Your payment has been successfully completed.',
    Failed: 'Your payment attempt failed. Please try again.',
    Refunded: 'Your payment has been refunded.',
};
// Order confirmation
export async function sendOrderPlacedEmail(user, order) {
    const html = `
    <h2>Thank you for your order, ${user.name || ''}!</h2>
    <p>Your order <b>#${order._id.slice(-5)}</b> has been placed successfully.</p>
    <p>Total Amount: <b>$${order.totalAmount.toFixed(2)}</b></p>
    <p>Status: <b>${order.status}</b></p>
  `;
    return sendMail(user.email, 'Order Confirmation', html);
}
// Order status update
export async function sendOrderStatusUpdateEmail(user, order) {
    const statusMsg = orderStatusMessages[order.status] ||
        `Your order status is now: ${order.status}`;
    const html = `
    <h2>Order Status Update</h2>
    <p>Order <b>#${order._id.slice(-5)}</b> is now <b>${order.status}</b>.</p>
    <p>${statusMsg}</p>
  `;
    return sendMail(user.email, 'Order Status Updated', html);
}
// Low stock alert
export async function sendLowStockEmail(adminEmails, lowStockProducts) {
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
// Custom single/bulk email
export async function sendCustomEmail(to, subject, html) {
    return sendMail(to, subject, html);
}
// Daily report
export async function sendDailySalesReportEmail(to, html) {
    return sendMail(to, 'Daily Sales Report', html);
}
// --- Background verify (non-blocking) ---
(async () => {
    try {
        const ok = await transporter.verify();
        if (ok)
            console.log('✅ SMTP connection verified');
    }
    catch (err) {
        console.warn('⚠️ SMTP verify failed:', err.message);
    }
})();
export { sendMail, transporter };
