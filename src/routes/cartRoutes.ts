import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getCart, addToCart, removeFromCart, updateCartItem, clearCart } from '../controllers/cartController.js';

const router = Router();

router.get('/', protect, getCart);
router.post('/', protect, addToCart);
router.delete('/', protect, clearCart);
router.put('/:productId', protect, updateCartItem);
router.delete('/:productId', protect, removeFromCart);

export default router; 