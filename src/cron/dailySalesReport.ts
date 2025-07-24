import cron from 'node-cron';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';
import { sendDailySalesReportEmail } from '../utils/email.js';

export function startDailySalesReportCron() {
    cron.schedule('10 0 * * *', async () => {
        try {
            const now = new Date();
            const start = new Date(now);
            start.setDate(now.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            // Get orders from yesterday
            const orders = await Order.find({ createdAt: { $gte: start, $lte: end } });
            const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            const orderCount = orders.length;
            // Top products
            const productMap: Record<string, { name: string; units: number; revenue: number }> = {};
            for (const order of orders) {
                for (const item of order.orderItems) {
                    const prodId = item.product.toString();
                    if (!productMap[prodId]) {
                        const prod = await Product.findById(item.product);
                        productMap[prodId] = { name: prod?.name || 'Unknown', units: 0, revenue: 0 };
                    }
                    productMap[prodId].units += item.qty;
                    productMap[prodId].revenue += item.price * item.qty;
                }
            }
            const topProducts = Object.values(productMap).sort((a, b) => b.units - a.units).slice(0, 5);
            // Build HTML
            let html = `<h2>Daily Sales Report (${start.toISOString().slice(0,10)})</h2>`;
            html += `<p>Total Revenue: <b>$${totalRevenue.toFixed(2)}</b></p>`;
            html += `<p>Total Orders: <b>${orderCount}</b></p>`;
            if (topProducts.length > 0) {
                html += '<h3>Top Products</h3><ul>';
                for (const p of topProducts) {
                    html += `<li>${p.name}: ${p.units} units, $${p.revenue.toFixed(2)}</li>`;
                }
                html += '</ul>';
            }
            // Get admin emails
            const settings = await Settings.findOne();
            const adminEmails = settings?.notificationEmails && settings.notificationEmails.length > 0
                ? settings.notificationEmails
                : [];
            if (adminEmails.length > 0) {
                await sendDailySalesReportEmail(adminEmails, html);
            }
        } catch (err) {
            console.error('Failed to send daily sales report:', err);
        }
    });
} 