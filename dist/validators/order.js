import Joi from 'joi';
export const createOrderSchema = Joi.object({
    orderItems: Joi.array().items(Joi.object({
        product: Joi.string().required(),
        qty: Joi.number().min(1).required(),
        price: Joi.number().min(0).required()
    })).min(1).required(),
    totalAmount: Joi.number().min(0).required(),
    paymentMethod: Joi.string().required(),
    shippingAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        postalCode: Joi.string().required(),
        country: Joi.string().required()
    }).required(),
    billingAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        postalCode: Joi.string().required(),
        country: Joi.string().required()
    }).required()
});
