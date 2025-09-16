
import { Router } from 'express';
import { uploadMultiple } from '../utils/multer.js'; // Use specific upload function
import { protect } from '../middlewares/authMiddleware.js';
import { requireRoles } from '../middlewares/roleMiddleware.js';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getTopSellingProducts, getLowStockProducts, bulkDeleteProducts, bulkUpdateProducts, bulkUpdateStock } from '../controllers/productController.js';

const router = Router();

router.route('/')
    .get(getProducts)
    .post(protect, requireRoles(['admin', 'superadmin']), uploadMultiple.array('images', 5), createProduct);

router.route('/:id')
    .get(getProductById)
    .put(protect, requireRoles(['admin', 'superadmin']), uploadMultiple.array('images', 5), updateProduct)
    .delete(protect, requireRoles(['admin', 'superadmin']), deleteProduct);

router.get('/top-selling', protect, requireRoles(['admin', 'superadmin']), getTopSellingProducts);
router.get('/low-stock', protect, requireRoles(['admin', 'superadmin']), getLowStockProducts);
router.post('/bulk-delete', protect, requireRoles(['admin', 'superadmin']), bulkDeleteProducts);
router.patch('/bulk-update', protect, requireRoles(['admin', 'superadmin']), bulkUpdateProducts);
router.patch('/bulk-update-stock', protect, requireRoles(['admin', 'superadmin']), bulkUpdateStock);

export default router;
