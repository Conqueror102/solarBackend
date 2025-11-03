import Joi from 'joi';

export const createContactSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required().trim()
    .messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 100 characters'
    }),
  email: Joi.string().email().required().trim().lowercase()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),
  subject: Joi.string().min(3).max(200).required().trim()
    .messages({
      'string.empty': 'Subject is required',
      'string.min': 'Subject must be at least 3 characters',
      'string.max': 'Subject cannot exceed 200 characters'
    }),
  message: Joi.string().min(10).max(2000).required().trim()
    .messages({
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 10 characters',
      'string.max': 'Message cannot exceed 2000 characters'
    })
});

export const updateContactStatusSchema = Joi.object({
  status: Joi.string().valid('new', 'read', 'replied', 'archived').required(),
  adminNotes: Joi.string().max(1000).optional().allow('')
});
