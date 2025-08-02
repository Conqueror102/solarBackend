import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
// Email configuration with better error handling
const createTransporter = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    // Gmail configuration with improved settings
    const gmailConfig = {
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        // Connection settings to prevent timeouts
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14, // Gmail limit
        // Timeout settings
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        // TLS settings
        secure: true,
        tls: {
            rejectUnauthorized: false
        }
    };
    // Alternative: Custom SMTP configuration
    const customSMTPConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        // Connection settings
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        // Timeout settings
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        // TLS settings
        tls: {
            rejectUnauthorized: false
        }
    };
    // Use custom SMTP if host is specified, otherwise use Gmail
    const config = process.env.SMTP_HOST ? customSMTPConfig : gmailConfig;
    return nodemailer.createTransport(config);
};
const transporter = createTransporter();
const orderStatusMessages = {
    'New': 'Your order has been received.',
    'Processing': 'Your order is currently being processed.',
    'Shipped': 'Good news! Your order has been shipped.',
    'Delivered': 'Your order has been delivered. Thank you for shopping with us!',
    'Cancelled': 'Your order has been cancelled. If you have questions, please contact support.'
};
const paymentStatusMessages = {
    'Pending': 'Your payment is pending.',
    'Processing': 'Your payment is being processed.',
    'Completed': 'Your payment has been successfully completed.',
    'Failed': 'Your payment attempt failed. Please try again.',
    'Refunded': 'Your payment has been refunded.'
};
async function sendMail(to, subject, html) {
    try {
        const mailOptions = {
            from: `"Solar Store" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        };
        const result = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}: ${result.messageId}`);
        return result;
    }
    catch (error) {
        console.error('Email sending failed:', {
            to,
            subject,
            error: error.message,
            code: error.code,
            command: error.command
        });
        // Don't throw error in production to prevent app crashes
        if (process.env.NODE_ENV === 'production') {
            console.error('Email failed but continuing...');
            return null;
        }
        else {
            throw error;
        }
    }
}
export async function sendOrderPlacedEmail(user, order) {
    const html = `
        <h2>Thank you for your order, ${user.name || ''}!</h2>
        <p>Your order <b>#${order._id.slice(-5)}</b> has been placed successfully.</p>
        <p>Total Amount: <b>$${order.totalAmount.toFixed(2)}</b></p>
        <p>Status: <b>${order.status}</b></p>
    `;
    await sendMail(user.email, 'Order Confirmation', html);
}
export async function sendOrderStatusUpdateEmail(user, order) {
    const statusMsg = orderStatusMessages[order.status] || `Your order status is now: ${order.status}`;
    const html = `
        <h2>Order Status Update</h2>
        <p>Order <b>#${order._id.slice(-5)}</b> is now <b>${order.status}</b>.</p>
        <p>${statusMsg}</p>
    `;
    await sendMail(user.email, 'Order Status Updated', html);
}
export async function sendLowStockEmail(adminEmails, lowStockProducts) {
    const productList = lowStockProducts.map(p => `<li>${p.name}: <b>${p.stock}</b> left</li>`).join('');
    const html = `
        <h2>Low Stock Alert</h2>
        <p>The following products are low in stock:</p>
        <ul>${productList}</ul>
    `;
    for (const email of adminEmails) {
        await sendMail(email, 'Low Stock Alert', html);
    }
}
export async function sendCustomEmail(to, subject, html) {
    if (Array.isArray(to)) {
        for (const email of to) {
            await sendMail(email, subject, html);
        }
    }
    else {
        await sendMail(to, subject, html);
    }
}
export async function sendDailySalesReportEmail(to, html) {
    for (const email of to) {
        await sendMail(email, 'Daily Sales Report', html);
    }
}
// Verify SMTP connection with better error handling
export const verifySMTPConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');
        return true;
    }
    catch (error) {
        console.error('❌ SMTP connection failed:', {
            message: error.message,
            code: error.code,
            command: error.command,
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || '587',
            user: process.env.SMTP_USER
        });
        // Provide helpful troubleshooting tips
        console.error('\n🔧 Troubleshooting tips:');
        console.error('1. Check your SMTP credentials in .env file');
        console.error('2. Ensure SMTP_USER and SMTP_PASS are correct');
        console.error('3. For Gmail, use App Password instead of regular password');
        console.error('4. Check if your email provider allows SMTP access');
        console.error('5. Try different SMTP settings (port 587 vs 465)');
        return false;
    }
};
// Initialize SMTP connection on startup
verifySMTPConnection();
