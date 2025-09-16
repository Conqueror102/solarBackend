// src/validators/payments.validators.ts
import Joi from "joi";
export const initPaystackSchema = Joi.object({
    orderId: Joi.string().required(), // Mongo _id
    callback_url: Joi.string().uri().optional(),
});
export const verifySchema = Joi.object({
    reference: Joi.string().required(),
});
