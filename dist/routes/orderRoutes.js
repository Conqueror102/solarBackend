import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRoles } from '../middlewares/roleMiddleware.js';
import { addOrder, getMyOrders, payOrder, getOrderById, updateOrder, deleteOrder, cancelOrder, getAllOrders } from '../controllers/orderController.js';
const router = Router();
router.route('/')
    .get(protect, requireRoles(['admin', 'superadmin']), getAllOrders)
    .post(protect, addOrder);
router.route('/myorders').get(protect, getMyOrders);
router.route('/pay').post(protect, payOrder);
router.route('/:id')
    .get(protect, getOrderById)
    .put(protect, requireRoles(['admin', 'superadmin']), updateOrder)
    .delete(protect, requireRoles(['admin', 'superadmin']), deleteOrder);
router.route('/:id/cancel').patch(protect, cancelOrder);
export default router;
