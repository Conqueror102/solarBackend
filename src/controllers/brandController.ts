/**
 * brandController.ts
 * ------------------
 * Handles brand creation, updating, deleting, and listing.
 */
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { createBrandSchema, updateBrandSchema, bulkUpdateBrandSchema } from '../validators/brand.js';
import uploadToCloudinary from '../utils/cloudinaryUpload.js';
import { validateImageFile } from '../utils/imageValidation.js';
import mongoose from 'mongoose';

// ⏩ queue producers
import {
  enqueueAdminBrandAdded,
  enqueueAdminBrandUpdated,
  enqueueAdminBrandDeleted,
} from '../queues/producers/adminNotificationProducers.js';

const getBrands = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, isActive, sortBy = 'name', sortOrder = 'asc' } = req.query;

  const filter: any = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { country: { $regex: search, $options: 'i' } },
    ];
  }
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const sort: any = {};
  sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

  const skip = (Number(page) - 1) * Number(limit);

  const [brands, total] = await Promise.all([
    Brand.find(filter).sort(sort).skip(skip).limit(Number(limit)).populate('productCount'),
    Brand.countDocuments(filter),
  ]);

  res.json({
    brands,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

const getBrandById = asyncHandler(async (req: Request, res: Response) => {
  const brand = await Brand.findById(req.params.id).populate('productCount');
  if (!brand) {
    res.status(404);
    throw new Error('Brand not found');
  }
  res.json(brand);
});

const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const brandData = {
    name: req.body.name,
    description: req.body.description,
    website: req.body.website,
    country: req.body.country,
    isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' : true,
  };

  const { error } = createBrandSchema.validate(brandData);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { name, description, website, country, isActive } = brandData;

  // enforce uniqueness (case-insensitive)
  const existingBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existingBrand) {
    res.status(400);
    throw new Error('Brand with this name already exists');
  }

  // optional logo upload
  let logoUrl = '';
  if ((req as any).file) {
    const logoFile = (req as any).file;
    const validation = validateImageFile(logoFile);
    if (!validation.isValid) {
      res.status(400);
      throw new Error(validation.error);
    }
    const result = await uploadToCloudinary(logoFile.buffer, logoFile.mimetype);
    logoUrl = result.secure_url;
  }

  const brand = await Brand.create({
    name,
    description,
    logo: logoUrl,
    website,
    country,
    isActive,
  });

  // enqueue admin notify
  const actor = (req as any)?.user?.name || 'System';
  await enqueueAdminBrandAdded({ brandId: brand._id.toString(), brandName: brand.name, addedBy: actor });

  res.status(201).json(brand);
});

const updateBrand = asyncHandler(async (req: Request, res: Response) => {
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

  // conflicting name?
  if (req.body.name && req.body.name !== brand.name) {
    const existingBrand = await Brand.findOne({
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
      _id: { $ne: brand._id },
    });
    if (existingBrand) {
      res.status(400);
      throw new Error('Brand with this name already exists');
    }
  }

  // optional new logo
  if ( (req as any).file ) {
    const logoFile = (req as any).file;
    const validation = validateImageFile(logoFile);
    if (!validation.isValid) {
      res.status(400);
      throw new Error(validation.error);
    }
    const result = await uploadToCloudinary(logoFile.buffer, logoFile.mimetype);
    brandData.logo = result.secure_url;
  }

  // track changed fields for audit (optional)
  const before = {
    name: brand.name,
    description: brand.description,
    website: brand.website,
    country: brand.country,
    isActive: brand.isActive,
    logo: brand.logo,
  };

  const updatedBrand = await Brand.findByIdAndUpdate(req.params.id, brandData, {
    new: true,
    runValidators: true,
  });

  // enqueue admin notify
  const actor = (req as any)?.user?.name || 'System';
  const changes: string[] = [];
  if (updatedBrand) {
    (['name', 'description', 'website', 'country', 'isActive', 'logo'] as const).forEach((k) => {
      if ((before as any)[k] !== (updatedBrand as any)[k]) changes.push(k);
    });
  }

  await enqueueAdminBrandUpdated({
    brandId: brand._id.toString(),
    oldBrandName: brand.name,
    newBrandName: updatedBrand?.name || brand.name,
    updatedBy: actor,
    changes,
  });

  res.json(updatedBrand);
});

const deleteBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) {
    res.status(404);
    throw new Error('Brand not found');
  }

  const productCount = await Product.countDocuments({ brand: brand._id });
  if (productCount > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete brand. It has ${productCount} associated products. Please reassign or delete the products first.`
    );
  }

  await Brand.findByIdAndDelete(req.params.id);

  const actor = (req as any)?.user?.name || 'System';
  await enqueueAdminBrandDeleted({ brandId: brand._id.toString(), brandName: brand.name, deletedBy: actor });

  res.json({ message: 'Brand deleted successfully' });
});

const getBrandProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find({ brand: req.params.id })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments({ brand: req.params.id }),
  ]);

  res.json({
    products,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

const getBrandStats = asyncHandler(async (req: Request, res: Response) => {
  const brandId = req.params.id;

  const [totalProducts, activeProducts, totalStockAgg, lowStockProducts, outOfStockProducts] = await Promise.all([
    Product.countDocuments({ brand: brandId }),
    Product.countDocuments({ brand: brandId, stock: { $gt: 0 } }),
    Product.aggregate([
      { $match: { brand: new mongoose.Types.ObjectId(brandId) } },
      { $group: { _id: null, total: { $sum: '$stock' } } },
    ]),
    Product.countDocuments({ brand: brandId, stock: { $lte: 10, $gt: 0 } }),
    Product.countDocuments({ brand: brandId, stock: 0 }),
  ]);

  res.json({
    totalProducts,
    activeProducts,
    totalStock: totalStockAgg[0]?.total || 0,
    lowStockProducts,
    outOfStockProducts,
  });
});

const bulkUpdateBrands = asyncHandler(async (req: Request, res: Response) => {
  const { error } = bulkUpdateBrandSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { ids, updates } = req.body;

  const result = await Brand.updateMany({ _id: { $in: ids } }, { $set: updates });

  // optional: enqueue a single admin activity summary if you want an audit trail
  // await enqueueAdminUserActivity({
  //   activityType: 'bulk_brand_update',
  //   details: `${result.modifiedCount} brand(s) updated`,
  // });

  res.json({
    message: `${result.modifiedCount} brand(s) updated successfully`,
    modifiedCount: result.modifiedCount,
  });
});

const getActiveBrands = asyncHandler(async (_req: Request, res: Response) => {
  const brands = await Brand.find({ isActive: true }).select('name logo').sort({ name: 1 });
  res.json(brands);
});

export {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandProducts,
  getBrandStats,
  bulkUpdateBrands,
  getActiveBrands,
};
