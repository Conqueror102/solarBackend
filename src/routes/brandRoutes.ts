import { Router } from 'express';
import { uploadSingle } from '../utils/multer.js'; // Use specific upload function
import { protect } from '../middlewares/authMiddleware.js';
import { requireRoles } from '../middlewares/roleMiddleware.js';
import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandProducts,
  getBrandStats,
  bulkUpdateBrands,
  getActiveBrands
} from '../controllers/brandController.js';

const router = Router();

// Public routes
router.get('/active', getActiveBrands);
router.get('/:id/products', getBrandProducts);
router.get('/:id/stats', protect, requireRoles(['admin', 'superadmin']), getBrandStats);

// Protected routes with file upload
router.route('/')
  .get(getBrands)
  .post(protect, requireRoles(['admin', 'superadmin']), uploadSingle.single('logo'), createBrand);

router.route('/:id')
  .get(getBrandById)
  .put(protect, requireRoles(['admin', 'superadmin']), uploadSingle.single('logo'), updateBrand)
  .delete(protect, requireRoles(['admin', 'superadmin']), deleteBrand);

// Bulk operations
router.patch('/bulk-update', protect, requireRoles(['admin', 'superadmin']), bulkUpdateBrands);

export default router;
