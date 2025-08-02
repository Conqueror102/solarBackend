/**
 * productController.js
 * --------------------
 * Handles product creation, updating, deleting, and listing.
 */
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { sendLowStockEmail } from '../utils/email.js';
import { createProductSchema, updateProductSchema } from '../validators/product.js';
import uploadToCloudinary from '../utils/cloudinaryUpload.js';
import { notifyProductAdded, notifyProductUpdated, notifyLowStockAlert, notifyOutOfStockAlert } from '../utils/adminNotificationService.js';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({});
    res.json(products);
});
const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        res.json(product);
    }
    else {
        res.status(404);
        throw new Error('Product not found');
    }
});
const createProduct = asyncHandler(async (req, res) => {
    // For multipart/form-data, fields are in req.body as strings
    const productData = {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price ? parseFloat(req.body.price) : undefined,
        category: req.body.category,
        stock: req.body.stock ? parseInt(req.body.stock) : 0
    };
    const { error } = createProductSchema.validate(productData);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { name, description, price, category, stock } = productData;
    let images = [];
    if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                res.status(400);
                throw new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.');
            }
            if (file.size > MAX_IMAGE_SIZE) {
                res.status(400);
                throw new Error('File too large. Max size is 2MB.');
            }
            // Use utility to upload to Cloudinary
            const result = await uploadToCloudinary(file.buffer, file.mimetype);
            images.push(result.secure_url);
        }
    }
    const product = await Product.create({
        name,
        description,
        price,
        category: new mongoose.Types.ObjectId(category),
        stock,
        images,
    });
    // Notify admins about new product
    const creator = req.user;
    await notifyProductAdded(product._id.toString(), product.name, creator?.name || 'System');
    res.status(201).json(product);
});
const updateProduct = asyncHandler(async (req, res) => {
    // For multipart/form-data, fields are in req.body as strings
    const productData = {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price ? parseFloat(req.body.price) : undefined,
        category: req.body.category,
        stock: req.body.stock ? parseInt(req.body.stock) : undefined
    };
    const { error } = updateProductSchema.validate(productData);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { name, description, price, category, stock } = productData;
    const product = await Product.findById(req.params.id);
    if (product) {
        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price || product.price;
        product.category = category ? new mongoose.Types.ObjectId(category) : product.category;
        product.stock = stock !== undefined ? stock : product.stock;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            let images = [];
            for (const file of req.files) {
                if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                    res.status(400);
                    throw new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.');
                }
                if (file.size > MAX_IMAGE_SIZE) {
                    res.status(400);
                    throw new Error('File too large. Max size is 2MB.');
                }
                // Use utility to upload to Cloudinary
                const result = await uploadToCloudinary(file.buffer, file.mimetype);
                images.push(result.secure_url);
            }
            product.images = images;
        }
        // Track changes for admin notification
        const changes = [];
        if (name && name !== product.name)
            changes.push('name');
        if (description && description !== product.description)
            changes.push('description');
        if (price && price !== product.price)
            changes.push('price');
        if (category && category !== product.category)
            changes.push('category');
        if (stock !== undefined && stock !== product.stock)
            changes.push('stock');
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            changes.push('images');
        }
        const updatedProduct = await product.save();
        // Notify admins about product update
        if (changes.length > 0) {
            const updater = req.user;
            await notifyProductUpdated(updatedProduct._id.toString(), updatedProduct.name, updater?.name || 'System', changes);
        }
        // Check for low stock alerts
        if (updatedProduct.stock <= 5 && updatedProduct.stock > 0) {
            await notifyLowStockAlert(updatedProduct._id.toString(), updatedProduct.name, updatedProduct.stock, 5);
        }
        else if (updatedProduct.stock === 0) {
            await notifyOutOfStockAlert(updatedProduct._id.toString(), updatedProduct.name);
        }
        res.json(updatedProduct);
    }
    else {
        res.status(404);
        throw new Error('Product not found');
    }
});
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await product.deleteOne();
        res.json({ message: 'Product removed' });
    }
    else {
        res.status(404);
        throw new Error('Product not found');
    }
});
const getTopSellingProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({}).limit(5);
    res.json(products);
});
const getLowStockProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ stock: { $lte: 5 } });
    res.json(products);
});
const bulkDeleteProducts = asyncHandler(async (req, res) => {
    const { ids } = req.body; // array of product IDs
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('No product IDs provided');
    }
    await Product.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Products deleted', count: ids.length });
});
const bulkUpdateProducts = asyncHandler(async (req, res) => {
    const { ids, category, status, price } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('No product IDs provided');
    }
    const update = {};
    if (category)
        update.category = category;
    if (status)
        update.status = status;
    if (price !== undefined)
        update.price = price;
    await Product.updateMany({ _id: { $in: ids } }, update);
    res.json({ message: 'Products updated', count: ids.length });
});
const bulkUpdateStock = asyncHandler(async (req, res) => {
    const { ids, setTo, adjustBy } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('No product IDs provided');
    }
    const products = await Product.find({ _id: { $in: ids } });
    const lowStockProducts = [];
    for (const product of products) {
        if (setTo !== undefined) {
            product.stock = setTo;
        }
        else if (adjustBy !== undefined) {
            product.stock += adjustBy;
        }
        if (product.stock <= 5) {
            lowStockProducts.push({ name: product.name, stock: product.stock });
        }
        await product.save();
    }
    // Notify admins if any product is low in stock
    if (lowStockProducts.length > 0) {
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        const adminEmails = admins.map(a => a.email);
        await sendLowStockEmail(adminEmails, lowStockProducts);
    }
    res.json({ message: 'Stock updated', count: products.length, lowStockProducts });
});
export { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getTopSellingProducts, getLowStockProducts, bulkDeleteProducts, bulkUpdateProducts, bulkUpdateStock };
