import asyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import { Category } from '../models/Category.js';

const getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await Category.find({});
    res.json(categories);
});

const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (category) {
        res.json(category);
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

const createCategory = asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body;
    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
        res.status(400);
        throw new Error('Category already exists');
    }
    const category = await Category.create({ name, description });
    res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (category) {
        category.name = req.body.name || category.name;
        category.description = req.body.description || category.description;
        await category.save();
        res.json(category);
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (category) {
        await category.deleteOne();
        res.json({ message: 'Category removed' });
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

export { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory }; 