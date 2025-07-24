import asyncHandler from 'express-async-handler';
const getAnalytics = asyncHandler(async (req, res) => {
    res.json({
        sales: [1000, 1200, 900, 1500],
        users: [200, 220, 210, 250],
        revenue: [5000, 6000, 5500, 7000]
    });
});
const getNotifications = asyncHandler(async (req, res) => {
    res.json([
        { id: 1, type: 'low_stock', message: 'Product X is low on stock.' },
        { id: 2, type: 'new_order', message: 'New order received from John Doe.' }
    ]);
});
export { getAnalytics, getNotifications };
