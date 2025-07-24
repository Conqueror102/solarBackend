
/**
 * productController.js
 * --------------------
 * Handles product creation, updating, deleting, and listing.
 */
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { Product } from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import { User } from '../models/User.js';
import { sendLowStockEmail } from '../utils/email.js';
import { createProductSchema, updateProductSchema } from '../validators/product.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const getProducts = asyncHandler(async (req: Request, res: Response) => {
    const products = await Product.find({});
    res.json(products);
});

const getProductById = asyncHandler(async (req: Request, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

const createProduct = asyncHandler(async (req: Request, res: Response) => {
    const { error } = createProductSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { name, description, price, category, stock } = req.body;
    let images: string[] = [];
    if ((req as any).files && Array.isArray((req as any).files)) {
        for (const file of (req as any).files) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                fs.unlinkSync(file.path);
                res.status(400);
                throw new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.');
            }
            if (file.size > MAX_IMAGE_SIZE) {
                fs.unlinkSync(file.path);
                res.status(400);
                throw new Error('File too large. Max size is 2MB.');
            }
            const result = await cloudinary.uploader.upload(file.path);
            fs.unlinkSync(file.path);
            images.push(result.secure_url);
        }
    }
    const product = await Product.create({
        name,
        description,
        price,
        category,
        stock,
        images,
    });
    res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const { error } = updateProductSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { name, description, price, category, stock } = req.body;
    const product = await Product.findById(req.params.id);
    if (product) {
        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price || product.price;
        product.category = category || product.category;
        product.stock = stock || product.stock;
        if ((req as any).files && Array.isArray((req as any).files) && (req as any).files.length > 0) {
            let images: string[] = [];
            for (const file of (req as any).files) {
                if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                    fs.unlinkSync(file.path);
                    res.status(400);
                    throw new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.');
                }
                if (file.size > MAX_IMAGE_SIZE) {
                    fs.unlinkSync(file.path);
                    res.status(400);
                    throw new Error('File too large. Max size is 2MB.');
                }
                const result = await cloudinary.uploader.upload(file.path);
                fs.unlinkSync(file.path);
                images.push(result.secure_url);
            }
            product.images = images;
        }
        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

const getTopSellingProducts = asyncHandler(async (req: Request, res: Response) => {
    const products = await Product.find({}).limit(5);
    res.json(products);
});

const getLowStockProducts = asyncHandler(async (req: Request, res: Response) => {
    const products = await Product.find({ stock: { $lte: 5 } });
    res.json(products);
});

const bulkDeleteProducts = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body; // array of product IDs
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('No product IDs provided');
    }
    await Product.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Products deleted', count: ids.length });
});

const bulkUpdateProducts = asyncHandler(async (req: Request, res: Response) => {
    const { ids, category, status, price } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('No product IDs provided');
    }
    const update: any = {};
    if (category) update.category = category;
    if (status) update.status = status;
    if (price !== undefined) update.price = price;
    await Product.updateMany({ _id: { $in: ids } }, update);
    res.json({ message: 'Products updated', count: ids.length });
});

const bulkUpdateStock = asyncHandler(async (req: Request, res: Response) => {
    const { ids, setTo, adjustBy } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('No product IDs provided');
    }
    const products = await Product.find({ _id: { $in: ids } });
    const lowStockProducts: { name: string; stock: number }[] = [];
    for (const product of products) {
        if (setTo !== undefined) {
            product.stock = setTo;
        } else if (adjustBy !== undefined) {
            product.stock += adjustBy;
        }
        if (product.stock <= 5) {
            lowStockProducts.push({ name: product.name, stock: product.stock });
        }
        await product.save();
    }
    // Notify admins if any product is low in stock
    if (lowStockProducts.length > 0) {
        const admins = await User.find({ isAdmin: true });
        const adminEmails = admins.map(a => a.email);
        await sendLowStockEmail(adminEmails, lowStockProducts);
    }
    res.json({ message: 'Stock updated', count: products.length, lowStockProducts });
});

export { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getTopSellingProducts, getLowStockProducts, bulkDeleteProducts, bulkUpdateProducts, bulkUpdateStock };
