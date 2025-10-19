import Joi from 'joi';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
const passwordMessage = 'Please create a strong password with at least 10 characters, including uppercase and lowercase letters, numbers, and special characters like @, $, !, %, *, ?, or &';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(10)
    .regex(passwordRegex)
    .message(passwordMessage)
    .required(),
  role: Joi.string().valid('user', 'admin', 'superadmin').optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
}); 