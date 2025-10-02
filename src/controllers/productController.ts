/**
 * productController.ts
 * --------------------
 * Handles product creation, updating, deleting, and listing.
 */
import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
// import { User } from '../models/User.js'; // no longer needed for emailing admins directly
// import { sendLowStockEmail } from '../utils/email.js'; // replaced with queued admin notifications
import { createProductSchema, updateProductSchema } from '../validators/product.js';
import uploadToCloudinary from '../utils/cloudinaryUpload.js';
import { validateImageFiles } from '../utils/imageValidation.js';
import path from 'path';

// 🔔 BullMQ producers (admin notifications)
import {
  enqueueAdminProductAdded,
  enqueueAdminProductUpdated,
  enqueueAdminLowStockAlert,
  enqueueAdminOutOfStockAlert,
  enqueueAdminUserActivity, // summary activity for bulk ops
} from '../queues/producers/adminNotificationProducers.js';

const getProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await Product.find({}).populate({ path: 'brand', select: 'name _id' });
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
  // For multipart/form-data, fields are in req.body as strings
  const productData = {
    name: req.body.name,
    description: req.body.description,
    price: req.body.price ? parseFloat(req.body.price) : undefined,
    category: req.body.category,
    brand: req.body.brand, // Added brand
    stock: req.body.stock ? parseInt(req.body.stock) : 0,
  };

  const { error } = createProductSchema.validate(productData);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { name, description, price, category, brand, stock } = productData;
  let images: string[] = [];

  if ((req as any).files && Array.isArray((req as any).files)) {
    // Validate all files at once
    const validation = validateImageFiles((req as any).files);
    if (!validation.isValid) {
      res.status(400);
      throw new Error(validation.error);
    }

    // Upload all valid files
    for (const file of (req as any).files) {
      const result = await uploadToCloudinary(file.buffer, file.mimetype);
      images.push(result.secure_url);
    }
  }

  const product = await Product.create({
    name,
    description,
    price,
    category: new mongoose.Types.ObjectId(category),
    brand: new mongoose.Types.ObjectId(brand), // Added brand
    stock,
    images,
  });

  // 🔔 enqueue admin notification (product added)
  const creator = (req as any).user;
  await enqueueAdminProductAdded({
    productId: product._id.toString(),
    productName: product.name,
    addedBy: creator?.name || 'System',
  });

  // low/out-of-stock checks at creation (your threshold policy is <= 5)
  if (product.stock <= 0) {
    await enqueueAdminOutOfStockAlert({
      productId: product._id.toString(),
      productName: product.name,
    });
  } else if (product.stock <= 5) {
    await enqueueAdminLowStockAlert({
      productId: product._id.toString(),
      productName: product.name,
      currentStock: product.stock,
      threshold: 5,
    });
  }

  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const productData = {
    name: req.body.name,
    description: req.body.description,
    price: req.body.price ? parseFloat(req.body.price) : undefined,
    category: req.body.category,
    brand: req.body.brand,
    stock: req.body.stock ? parseInt(req.body.stock) : undefined,
  };

  const { error } = updateProductSchema.validate(productData);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { name, description, price, category, brand, stock } = productData;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const changes: string[] = [];

  if (name && name !== product.name) {
    product.name = name;
    changes.push('name');
  }
  if (description && description !== product.description) {
    product.description = description;
    changes.push('description');
  }
  if (price !== undefined && price !== product.price) {
    product.price = price;
    changes.push('price');
  }
  if (category && category.toString() !== product.category.toString()) {
    product.category = new mongoose.Types.ObjectId(category);
    changes.push('category');
  }
  if (brand && brand.toString() !== product.brand.toString()) {
    product.brand = new mongoose.Types.ObjectId(brand); // cast to ObjectId
    changes.push('brand');
  }
  const beforeStock = product.stock;
  if (stock !== undefined && stock !== product.stock) {
    product.stock = stock;
    changes.push('stock');
  }

  if ((req as any).files && Array.isArray((req as any).files) && (req as any).files.length > 0) {
    const validation = validateImageFiles((req as any).files);
    if (!validation.isValid) {
      res.status(400);
      throw new Error(validation.error);
    }

    const newImages: string[] = [];
    for (const file of (req as any).files) {
      const result = await uploadToCloudinary(file.buffer, file.mimetype);
      newImages.push(result.secure_url);
    }
    product.images = newImages;
    changes.push('images');
  }

  const updatedProduct = await product.save();

  // 🔔 enqueue admin notification (product updated) if something changed
  if (changes.length > 0) {
    const updater = (req as any).user;
    await enqueueAdminProductUpdated({
      productId: updatedProduct._id.toString(),
      productName: updatedProduct.name,
      updatedBy: updater?.name || 'System',
      changes,
    });
  }

  // low/out-of-stock alerts based on updated stock (<=5 threshold preserved)
  const afterStock = updatedProduct.stock;
  const wentOutOfStock = beforeStock > 0 && afterStock <= 0;
  const wentLow = beforeStock > 5 && afterStock > 0 && afterStock <= 5;

  if (wentOutOfStock) {
    await enqueueAdminOutOfStockAlert({
      productId: updatedProduct._id.toString(),
      productName: updatedProduct.name,
    });
  } else if (wentLow) {
    await enqueueAdminLowStockAlert({
      productId: updatedProduct._id.toString(),
      productName: updatedProduct.name,
      currentStock: afterStock,
      threshold: 5,
    });
  }

  res.json(updatedProduct);
});

const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    await product.deleteOne();
    // Optional: enqueueAdminUserActivity({ activityType: 'product_deleted', details: `Product ${product._id} - ${product.name} deleted` });
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

const getTopSellingProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await Product.find({}).limit(5);
  res.json(products);
});

const getLowStockProducts = asyncHandler(async (_req: Request, res: Response) => {
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
  if (category) update.category = new mongoose.Types.ObjectId(category);
  if (status) update.status = status;
  if (price !== undefined) update.price = price;

  await Product.updateMany({ _id: { $in: ids } }, update);
  // Optional: enqueueAdminUserActivity({ activityType: 'bulk_products_updated', details: `${ids.length} products updated` });
  res.json({ message: 'Products updated', count: ids.length });
});

const bulkUpdateStock = asyncHandler(async (req: Request, res: Response) => {
  const { ids, setTo, adjustBy } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error('No product IDs provided');
  }

  const products = await Product.find({ _id: { $in: ids } });

  const lowStockNow: Array<{ id: string; name: string; stock: number }> = [];
  const outOfStockNow: Array<{ id: string; name: string }> = [];

  for (const product of products) {
    const before = product.stock;

    if (setTo !== undefined) {
      product.stock = Number(setTo);
    } else if (adjustBy !== undefined) {
      product.stock = Number(product.stock) + Number(adjustBy);
    }

    // save per product to get accurate after-state
    await product.save();

    // enqueue alerts according to your <=5 rule
    if (product.stock <= 0 && before > 0) {
      outOfStockNow.push({ id: product._id.toString(), name: product.name });
      await enqueueAdminOutOfStockAlert({
        productId: product._id.toString(),
        productName: product.name,
      });
    } else if (product.stock > 0 && product.stock <= 5 && before > 5) {
      lowStockNow.push({ id: product._id.toString(), name: product.name, stock: product.stock });
      await enqueueAdminLowStockAlert({
        productId: product._id.toString(),
        productName: product.name,
        currentStock: product.stock,
        threshold: 5,
      });
    }
  }

  // 🔔 one summary activity (no email spam)
  if (lowStockNow.length || outOfStockNow.length) {
    const actor = (req as any)?.user?.name || 'system';
    await enqueueAdminUserActivity({
      activityType: 'bulk_stock_update',
      userName: actor,
      userEmail: '',
      details: `Bulk stock update by ${actor}: ${lowStockNow.length} low-stock, ${outOfStockNow.length} out-of-stock`,
    });
  }

  res.json({
    message: 'Stock updated',
    count: products.length,
    lowStockProducts: lowStockNow.map(p => ({ name: p.name, stock: p.stock })),
    outOfStockProducts: outOfStockNow.map(p => ({ name: p.name })),
  });
});

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getTopSellingProducts,
  getLowStockProducts,
  bulkDeleteProducts,
  bulkUpdateProducts,
  bulkUpdateStock,
};
