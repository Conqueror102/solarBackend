import nodemailer from 'nodemailer';

// Configure the transporter (use environment variables for sensitive info)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "victorvector608@gmail.com",
        pass: "xvqqzlwiaadvihbd",
    },
});

interface UserInfo {
    email: string;
    name?: string;
}

interface OrderInfo {
    _id: string;
    totalAmount: number;
    status: string;
}

const statusMessages: Record<string, string> = {
    'Pending': 'Your order has been received and is pending processing.',
    'Processing': 'Your order is currently being processed.',
    'Shipped': 'Good news! Your order has been shipped.',
    'Delivered': 'Your order has been delivered. Thank you for shopping with us!',
    'Cancelled': 'Your order has been cancelled. If you have questions, please contact support.',
    // Add more statuses as needed
};

async function sendMail(to: string, subject: string, html: string) {
    const mailOptions = {
        from: process.env.SMTP_USER, // Example with a fixed name
        to,
        subject,
        html,
    };
    await transporter.sendMail(mailOptions);
}

export async function sendOrderPlacedEmail(user: UserInfo, order: OrderInfo) {
    const html = `
        <h2>Thank you for your order, ${user.name || ''}!</h2>
        <p>Your order <b>#${order._id.slice(-5)}</b> has been placed successfully.</p>
        <p>Total Amount: <b>$${order.totalAmount.toFixed(2)}</b></p>
        <p>Status: <b>${order.status}</b></p>
    `;
    await sendMail(user.email, 'Order Confirmation', html);
}

export async function sendOrderStatusUpdateEmail(user: UserInfo, order: OrderInfo) {
    const statusMsg = statusMessages[order.status] || `Your order status is now: ${order.status}`;
    const html = `
        <h2>Order Status Update</h2>
        <p>Order <b>#${order._id.slice(-5)}</b> is now <b>${order.status}</b>.</p>
        <p>${statusMsg}</p>
    `;
    await sendMail(user.email, 'Order Status Updated', html);
}

export async function sendLowStockEmail(adminEmails: string[], lowStockProducts: { name: string; stock: number; }[]) {
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

export async function sendCustomEmail(to: string | string[], subject: string, html: string) {
    if (Array.isArray(to)) {
        for (const email of to) {
            await sendMail(email, subject, html);
        }
    } else {
        await sendMail(to, subject, html);
    }
}

export async function sendDailySalesReportEmail(to: string[], html: string) {
    for (const email of to) {
        await sendMail(email, 'Daily Sales Report', html);
    }
} 

transporter.verify((error, success) => {
    if (error) {
      console.error('SMTP connection error:', error);
    } else {
      console.log('SMTP connected successfully');
    }
  });
  