import Joi from 'joi';
export const createUserSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('user', 'admin', 'superadmin').optional()
});
export const updateUserSchema = Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(8).optional(),
    role: Joi.string().valid('user', 'admin', 'superadmin').optional()
});
