import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRoles } from '../middlewares/roleMiddleware.js';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';

const router = Router();

router.route('/')
    .get(getCategories)
    .post(protect, requireRoles(['admin', 'superadmin']), createCategory);

router.route('/:id')
    .get(getCategoryById)
    .put(protect, requireRoles(['admin', 'superadmin']), updateCategory)
    .delete(protect, requireRoles(['admin', 'superadmin']), deleteCategory);

export default router; 