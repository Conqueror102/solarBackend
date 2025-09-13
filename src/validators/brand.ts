import Joi from 'joi';

export const createBrandSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().trim(),
  description: Joi.string().max(500).optional().allow(''),
  website: Joi.string().uri().optional().allow(''),
  country: Joi.string().max(50).optional().allow(''),
  isActive: Joi.boolean().optional()
  // Note: logo is handled as file upload, not in validation schema
});

export const updateBrandSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().trim(),
  description: Joi.string().max(500).optional().allow(''),
  website: Joi.string().uri().optional().allow(''),
  country: Joi.string().max(50).optional().allow(''),
  isActive: Joi.boolean().optional()
  // Note: logo is handled as file upload, not in validation schema
});

export const bulkUpdateBrandSchema = Joi.object({
  ids: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
  updates: Joi.object({
    isActive: Joi.boolean().optional()
  }).required()
});
