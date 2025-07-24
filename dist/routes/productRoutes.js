import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRoles } from '../middlewares/roleMiddleware.js';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getTopSellingProducts, getLowStockProducts, bulkDeleteProducts, bulkUpdateProducts, bulkUpdateStock } from '../controllers/productController.js';
const router = Router();
// Configure Multer for file upload
const storage = multer.diskStorage({
    destination(_req, _file, cb) {
        cb(null, 'uploads/');
    },
    filename(_req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });
router.route('/')
    .get(getProducts)
    .post(protect, requireRoles(['admin', 'superadmin']), upload.array('images', 5), createProduct);
router.route('/:id')
    .get(getProductById)
    .put(protect, requireRoles(['admin', 'superadmin']), upload.array('images', 5), updateProduct)
    .delete(protect, requireRoles(['admin', 'superadmin']), deleteProduct);
router.get('/top-selling', protect, requireRoles(['admin', 'superadmin']), getTopSellingProducts);
router.get('/low-stock', protect, requireRoles(['admin', 'superadmin']), getLowStockProducts);
router.post('/bulk-delete', protect, requireRoles(['admin', 'superadmin']), bulkDeleteProducts);
router.patch('/bulk-update', protect, requireRoles(['admin', 'superadmin']), bulkUpdateProducts);
router.patch('/bulk-update-stock', protect, requireRoles(['admin', 'superadmin']), bulkUpdateStock);
export default router;
