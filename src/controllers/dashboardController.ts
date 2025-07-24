import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

// GET /api/dashboard
const getDashboardData = asyncHandler(async (req: Request, res: Response) => {
    // Total Revenue (sum of all paid orders)
    const totalRevenueResult = await Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Orders Today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const ordersToday = await Order.countDocuments({ createdAt: { $gte: startOfToday } });

    // Active Customers (unique users who placed orders this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const activeCustomersResult = await Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: '$user' } },
        { $count: 'count' }
    ]);
    const activeCustomers = activeCustomersResult[0]?.count || 0;

    // Low Stock Items (stock <= 5)
    const lowStockItems = await Product.countDocuments({ stock: { $lte: 5 } });

    // Sales Overview (daily sales for last 30 days)
    const startOfPeriod = new Date();
    startOfPeriod.setDate(startOfPeriod.getDate() - 29);
    startOfPeriod.setHours(0, 0, 0, 0);
    const salesOverview = await Order.aggregate([
        { $match: { createdAt: { $gte: startOfPeriod }, isPaid: true } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 }
        } },
        { $sort: { _id: 1 } }
    ]);

    // Order Status Distribution
    const orderStatus = await Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const orderStatusMap: Record<string, number> = {};
    orderStatus.forEach(s => { orderStatusMap[s._id] = s.count; });

    res.json({
        totalRevenue,
        ordersToday,
        activeCustomers,
        lowStockItems,
        salesOverview,
        orderStatus: orderStatusMap
    });
});

const getAnalyticsOverview = asyncHandler(async (req: Request, res: Response) => {
    // Parse date range from query (default: last 30 days)
    const { start, end } = req.query;
    const endDate = end ? new Date(end as string) : new Date();
    const startDate = start ? new Date(start as string) : new Date(endDate);
    if (!start) startDate.setDate(endDate.getDate() - 29);

    // Previous period for comparison
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (periodDays - 1));

    // Helper to aggregate metrics for a period
    async function getMetrics(start: Date, end: Date) {
        const orders = await Order.find({ createdAt: { $gte: start, $lte: end } });
        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const orderCount = orders.length;
        const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
        const customerIds = [...new Set(orders.map(o => o.user.toString()))];
        const totalCustomers = customerIds.length;
        // Conversion rate: orders / customers (or sessions if available)
        const conversionRate = totalCustomers > 0 ? (orderCount / totalCustomers) * 100 : 0;
        // Revenue trends (per day)
        const trends: Record<string, number> = {};
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayStr = d.toISOString().slice(0, 10);
            trends[dayStr] = 0;
        }
        orders.forEach(o => {
            const dayStr = o.createdAt?.toISOString().slice(0, 10);
            if (dayStr && trends[dayStr] !== undefined) {
                trends[dayStr] += o.totalAmount || 0;
            }
        });
        return { totalRevenue, aov, totalCustomers, conversionRate, trends };
    }

    const current = await getMetrics(startDate, endDate);
    const previous = await getMetrics(prevStart, prevEnd);

    // Calculate period-over-period change
    function percentChange(current: number, previous: number) {
        if (previous === 0) return current === 0 ? 0 : 100;
        return ((current - previous) / previous) * 100;
    }

    res.json({
        totalRevenue: current.totalRevenue,
        totalRevenueChange: percentChange(current.totalRevenue, previous.totalRevenue),
        aov: current.aov,
        aovChange: percentChange(current.aov, previous.aov),
        totalCustomers: current.totalCustomers,
        totalCustomersChange: percentChange(current.totalCustomers, previous.totalCustomers),
        conversionRate: current.conversionRate,
        conversionRateChange: percentChange(current.conversionRate, previous.conversionRate),
        trends: current.trends
    });
});

const getSalesPerformance = asyncHandler(async (req: Request, res: Response) => {
    // Default: last 6 months
    const { start, end } = req.query;
    const endDate = end ? new Date(end as string) : new Date();
    const startDate = start ? new Date(start as string) : new Date(endDate);
    if (!start) startDate.setMonth(endDate.getMonth() - 5, 1);
    // Aggregate by month
    const sales = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
        } },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 6 }
    ]);
    // Format results
    const formatted = sales.map(s => {
        const date = new Date(s._id.year, s._id.month - 1);
        const period = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        const avgOrder = s.orders > 0 ? s.revenue / s.orders : 0;
        return {
            period,
            revenue: s.revenue,
            orders: s.orders,
            avgOrder: avgOrder
        };
    }).reverse();
    res.json(formatted);
});

const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
    // Default: last month
    const { start, end } = req.query;
    const endDate = end ? new Date(end as string) : new Date();
    const startDate = start ? new Date(start as string) : new Date(endDate);
    if (!start) startDate.setMonth(endDate.getMonth() - 1);
    // Previous period
    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setMonth(prevEnd.getMonth() - 1);
    // Helper to aggregate product sales for a period
    async function getProductStats(start: Date, end: Date) {
        const orders = await Order.find({ createdAt: { $gte: start, $lte: end } });
        const productMap: Record<string, { name: string; units: number; revenue: number }> = {};
        for (const order of orders) {
            for (const item of order.orderItems) {
                const prodId = item.product.toString();
                if (!productMap[prodId]) {
                    // Get product name
                    const prod = await Product.findById(item.product);
                    productMap[prodId] = { name: prod?.name || 'Unknown', units: 0, revenue: 0 };
                }
                productMap[prodId].units += item.qty;
                productMap[prodId].revenue += item.price * item.qty;
            }
        }
        return productMap;
    }
    const current = await getProductStats(startDate, endDate);
    const previous = await getProductStats(prevStart, prevEnd);
    // Calculate % change and sort by units sold
    const products = Object.entries(current).map(([id, data]) => {
        const prev = previous[id] || { units: 0, revenue: 0 };
        const unitsChange = prev.units === 0 ? (data.units === 0 ? 0 : 100) : ((data.units - prev.units) / prev.units) * 100;
        const revenueChange = prev.revenue === 0 ? (data.revenue === 0 ? 0 : 100) : ((data.revenue - prev.revenue) / prev.revenue) * 100;
        return {
            name: data.name,
            unitsSold: data.units,
            revenue: data.revenue,
            revenueChange: revenueChange
        };
    }).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);
    res.json(products);
});

const getCustomReport = asyncHandler(async (req: Request, res: Response) => {
    const { metrics = ["revenue"], dimensions = ["month"], start, end, filters = {} } = req.body;
    const endDate = end ? new Date(end) : new Date();
    const startDate = start ? new Date(start) : new Date(endDate);
    if (!start) startDate.setMonth(endDate.getMonth() - 5, 1);
    // Build match stage
    const match: any = { createdAt: { $gte: startDate, $lte: endDate } };
    if (filters.product) match["orderItems.product"] = filters.product;
    if (filters.customer) match["user"] = filters.customer;
    if (filters.status) match["status"] = filters.status;
    // Build group _id
    let groupId: any = {};
    if (dimensions.includes("month")) {
        groupId.month = { $month: "$createdAt" };
        groupId.year = { $year: "$createdAt" };
    }
    if (dimensions.includes("day")) {
        groupId.day = { $dayOfMonth: "$createdAt" };
        groupId.month = { $month: "$createdAt" };
        groupId.year = { $year: "$createdAt" };
    }
    if (dimensions.includes("product")) {
        groupId.product = "$orderItems.product";
    }
    if (dimensions.includes("customer")) {
        groupId.customer = "$user";
    }
    if (dimensions.includes("status")) {
        groupId.status = "$status";
    }
    // Build aggregation metrics
    let group: any = { _id: groupId };
    if (metrics.includes("revenue")) group.revenue = { $sum: "$totalAmount" };
    if (metrics.includes("orders")) group.orders = { $sum: 1 };
    if (metrics.includes("unitsSold")) group.unitsSold = { $sum: { $sum: "$orderItems.qty" } };
    // AOV will be calculated after aggregation
    // Unwind orderItems if product or unitsSold is requested
    let pipeline: any[] = [ { $match: match } ];
    if (dimensions.includes("product") || metrics.includes("unitsSold")) {
        pipeline.push({ $unwind: "$orderItems" });
    }
    pipeline.push({ $group: group });
    // Sort by period or metric
    pipeline.push({ $sort: { "_id.year": 1, "_id.month": 1, revenue: -1 } });
    const results = await Order.aggregate(pipeline);
    // Calculate AOV if requested
    if (metrics.includes("aov")) {
        results.forEach((r: any) => {
            r.aov = r.orders > 0 ? r.revenue / r.orders : 0;
        });
    }
    // Populate product/customer names if needed
    if (dimensions.includes("product")) {
        const productIds = results.map((r: any) => r._id.product).filter(Boolean);
        const products = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map(p => [p._id.toString(), p.name]));
        results.forEach((r: any) => {
            r.productName = productMap.get(r._id.product?.toString()) || "Unknown";
        });
    }
    if (dimensions.includes("customer")) {
        const customerIds = results.map((r: any) => r._id.customer).filter(Boolean);
        const users = await User.find({ _id: { $in: customerIds } });
        const userMap = new Map(users.map(u => [u._id.toString(), u.name]));
        results.forEach((r: any) => {
            r.customerName = userMap.get(r._id.customer?.toString()) || "Unknown";
        });
    }
    res.json(results);
});

export { getDashboardData, getAnalyticsOverview, getSalesPerformance, getTopProducts, getCustomReport }; 