import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).required(),
  price: Joi.number().min(0).required(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  category: Joi.string().hex().length(24).required(), // MongoDB ObjectId validation
  brand: Joi.string().hex().length(24).required(), // MongoDB ObjectId validation
  stock: Joi.number().min(0).default(0)
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().min(0).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  category: Joi.string().hex().length(24).optional(), // MongoDB ObjectId validation
  brand: Joi.string().hex().length(24).optional(), // MongoDB ObjectId validation
  stock: Joi.number().min(0).optional()
}); 