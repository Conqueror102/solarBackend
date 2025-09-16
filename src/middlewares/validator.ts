// src/middlewares/validate.ts
import { Request, Response, NextFunction } from "express";
import Joi from "joi";

export const validate =
  (schema: Joi.ObjectSchema<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(422).json({
        error: "ValidationError",
        details: error.details.map((d) => d.message),
      });
    }
    req.body = value;
    next();
  };
