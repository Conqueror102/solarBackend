import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';

const getCart = asyncHandler(async (req: Request, res: Response) => {
    let cart = await Cart.findOne({ user: (req as any).user._id }).populate('items.product');
    if (!cart) {
        cart = await Cart.create({ user: (req as any).user._id, items: [] });
    }
    res.json(cart);
});

const addToCart = asyncHandler(async (req: Request, res: Response) => {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    if (product.stock === 0) {
        res.status(400);
        throw new Error('Product is out of stock');
    }
    const addQty = quantity || 1;
    if (addQty <= 0) {
        res.status(400);
        throw new Error('Quantity must be at least 1');
    }
    let cart = await Cart.findOne({ user: (req as any).user._id });
    if (!cart) {
        cart = await Cart.create({ user: (req as any).user._id, items: [] });
    }
    const itemIndex = cart.items.findIndex((item: any) => item.product.equals(productId));
    let newQty = addQty;
    if (itemIndex > -1) {
        newQty = cart.items[itemIndex].quantity + addQty;
    }
    if (newQty > product.stock) {
        res.status(400);
        throw new Error(`Cannot add more than available stock (${product.stock}) to cart`);
    }
    if (itemIndex > -1) {
        cart.items[itemIndex].quantity = newQty;
    } else {
        cart.items.push({ product: productId, quantity: addQty });
    }
    await cart.save();
    res.json(cart);
});

const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    let cart = await Cart.findOne({ user: (req as any).user._id });
    if (!cart) {
        res.status(404);
        throw new Error('Cart not found');
    }
    cart.items = cart.items.filter((item: any) => !item.product.equals(productId));
    await cart.save();
    res.json(cart);
});

const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    let cart = await Cart.findOne({ user: (req as any).user._id });
    if (!cart) {
        res.status(404);
        throw new Error('Cart not found');
    }
    const item = cart.items.find((item: any) => item.product.equals(productId));
    if (!item) {
        res.status(404);
        throw new Error('Product not in cart');
    }
    // Check product stock
    const product = await Product.findById(productId);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    if (quantity > product.stock) {
        res.status(400);
        throw new Error(`Cannot set quantity above available stock (${product.stock})`);
    }
    item.quantity = quantity;
    await cart.save();
    res.json(cart)
   
});

const clearCart = asyncHandler(async (req: Request, res: Response) => {
    let cart = await Cart.findOne({ user: (req as any).user._id });
    if (!cart) {
        res.status(404);
        throw new Error('Cart not found');
    }
    cart.items = [];
    await cart.save();
    res.json(cart);
});

export { getCart, addToCart, removeFromCart, updateCartItem, clearCart }; 