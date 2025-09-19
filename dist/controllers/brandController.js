import asyncHandler from 'express-async-handler';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { createBrandSchema, updateBrandSchema, bulkUpdateBrandSchema } from '../validators/brand.js';
import { notifyBrandAdded, notifyBrandUpdated, notifyBrandDeleted } from '../utils/adminNotificationService.js';
import uploadToCloudinary from '../utils/cloudinaryUpload.js';
import { validateImageFile } from '../utils/imageValidation.js'; // Import validation utility
import mongoose from 'mongoose';
const getBrands = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search, isActive, sortBy = 'name', sortOrder = 'asc' } = req.query;
    // Build filter
    const filter = {};
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { country: { $regex: search, $options: 'i' } }
        ];
    }
    if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
    }
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const skip = (Number(page) - 1) * Number(limit);
    const brands = await Brand.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('productCount');
    const total = await Brand.countDocuments(filter);
    res.json({
        brands,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});
const getBrandById = asyncHandler(async (req, res) => {
    const brand = await Brand.findById(req.params.id).populate('productCount');
    if (!brand) {
        res.status(404);
        throw new Error('Brand not found');
    }
    res.json(brand);
});
const createBrand = asyncHandler(async (req, res) => {
    // For multipart/form-data, fields are in req.body as strings
    const brandData = {
        name: req.body.name,
        description: req.body.description,
        website: req.body.website,
        country: req.body.country,
        isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' : true
    };
    const { error } = createBrandSchema.validate(brandData);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { name, description, website, country, isActive } = brandData;
    // Check if brand already exists
    const existingBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingBrand) {
        res.status(400);
        throw new Error('Brand with this name already exists');
    }
    // Handle logo upload
    let logoUrl = '';
    if (req.file) {
        const logoFile = req.file;
        // Validate image using utility
        const validation = validateImageFile(logoFile);
        if (!validation.isValid) {
            res.status(400);
            throw new Error(validation.error);
        }
        // Upload to Cloudinary
        const result = await uploadToCloudinary(logoFile.buffer, logoFile.mimetype);
        logoUrl = result.secure_url;
    }
    const brand = await Brand.create({
        name,
        description,
        logo: logoUrl,
        website,
        country,
        isActive
    });
    // Notify admins
    await notifyBrandAdded(brand._id.toString(), brand.name);
    res.status(201).json(brand);
});
const updateBrand = asyncHandler(async (req, res) => {
    // For multipart/form-data, fields are in req.body as strings
    const brandData = {
        name: req.body.name,
        description: req.body.description,
        website: req.body.website,
        country: req.body.country,
        isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' : undefined,
        logo: '',
    };
    const { error } = updateBrandSchema.validate(brandData);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
        res.status(404);
        throw new Error('Brand not found');
    }
    // Check if name is being changed and if it conflicts
    if (req.body.name && req.body.name !== brand.name) {
        const existingBrand = await Brand.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
            _id: { $ne: brand._id }
        });
        if (existingBrand) {
            res.status(400);
            throw new Error('Brand with this name already exists');
        }
    }
    // Handle logo upload
    if (req.file) {
        const logoFile = req.file;
        // Validate image using utility
        const validation = validateImageFile(logoFile);
        if (!validation.isValid) {
            res.status(400);
            throw new Error(validation.error);
        }
        // Upload to Cloudinary
        const result = await uploadToCloudinary(logoFile.buffer, logoFile.mimetype);
        brandData.logo = result.secure_url;
    }
    const updatedBrand = await Brand.findByIdAndUpdate(req.params.id, brandData, { new: true, runValidators: true });
    // Notify admins
    await notifyBrandUpdated(brand._id.toString(), brand.name, updatedBrand?.name || brand.name);
    res.json(updatedBrand);
});
const deleteBrand = asyncHandler(async (req, res) => {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
        res.status(404);
        throw new Error('Brand not found');
    }
    // Check if brand has products
    const productCount = await Product.countDocuments({ brand: brand._id });
    if (productCount > 0) {
        res.status(400);
        throw new Error(`Cannot delete brand. It has ${productCount} associated products. Please reassign or delete the products first.`);
    }
    await Brand.findByIdAndDelete(req.params.id);
    // Notify admins
    await notifyBrandDeleted(brand._id.toString(), brand.name);
    res.json({ message: 'Brand deleted successfully' });
});
const getBrandProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const products = await Product.find({ brand: req.params.id })
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));
    const total = await Product.countDocuments({ brand: req.params.id });
    res.json({
        products,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    });
});
const getBrandStats = asyncHandler(async (req, res) => {
    const brandId = req.params.id;
    const [totalProducts, activeProducts, totalStock, lowStockProducts, outOfStockProducts] = await Promise.all([
        // Total products for the brand
        Product.countDocuments({ brand: brandId }),
        // Active = products with stock > 0
        Product.countDocuments({ brand: brandId, stock: { $gt: 0 } }),
        // Total stock (sum of stock across all products)
        Product.aggregate([
            { $match: { brand: new mongoose.Types.ObjectId(brandId) } },
            { $group: { _id: null, total: { $sum: '$stock' } } }
        ]),
        // Low stock = products with stock between 1 and 10
        Product.countDocuments({ brand: brandId, stock: { $lte: 10, $gt: 0 } }),
        // Out of stock = products with stock = 0
        Product.countDocuments({ brand: brandId, stock: 0 })
    ]);
    res.json({
        totalProducts,
        activeProducts,
        totalStock: totalStock[0]?.total || 0,
        lowStockProducts,
        outOfStockProducts
    });
});
const bulkUpdateBrands = asyncHandler(async (req, res) => {
    const { error } = bulkUpdateBrandSchema.validate(req.body);
    if (error) {
        res.status(400);
        throw new Error(error.details[0].message);
    }
    const { ids, updates } = req.body;
    const result = await Brand.updateMany({ _id: { $in: ids } }, { $set: updates });
    res.json({
        message: `${result.modifiedCount} brand(s) updated successfully`,
        modifiedCount: result.modifiedCount
    });
});
const getActiveBrands = asyncHandler(async (req, res) => {
    const brands = await Brand.find({ isActive: true })
        .select('name logo')
        .sort({ name: 1 });
    res.json(brands);
});
export { getBrands, getBrandById, createBrand, updateBrand, deleteBrand, getBrandProducts, getBrandStats, bulkUpdateBrands, getActiveBrands };
