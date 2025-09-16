import { AppError, SAFE_ERROR_MESSAGES } from '../utils/errorUtils.js';
// Read environment variables once at module load time
const NODE_ENV = process.env.NODE_ENV;
import mongoose from 'mongoose';
import Joi from 'joi';
/**
 * errorMiddleware.js
 * ------------------
 * Provides centralized error handling for Express applications.
 */
// Not Found Middleware
const notFound = (req, res, next) => {
    next(new AppError(`Not Found - ${req.originalUrl}`, 404, 'NOT_FOUND'));
};
// MongoDB Duplicate Key Error Handler
const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyPattern)[0];
    return new AppError(SAFE_ERROR_MESSAGES.EMAIL_IN_USE, 409, 'DUPLICATE_ERROR');
};
// MongoDB Validation Error Handler
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(error => error.message);
    return new AppError(`Invalid input data. ${errors.join('. ')}`, 400, 'VALIDATION_ERROR');
};
// Joi Validation Error Handler
const handleJoiValidationError = (err) => {
    return new AppError(SAFE_ERROR_MESSAGES.VALIDATION_FAILED, 400, 'VALIDATION_ERROR');
};
// JWT Error Handler
const handleJWTError = () => {
    return new AppError(SAFE_ERROR_MESSAGES.INVALID_TOKEN, 401, 'AUTHENTICATION_ERROR');
};
// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    // Log error for debugging
    if (NODE_ENV === 'development') {
        console.error('Error 🔥:', err);
    }
    // Handle specific error types
    if (err instanceof mongoose.Error.CastError) {
        error = new AppError(SAFE_ERROR_MESSAGES.VALIDATION_FAILED, 400, 'VALIDATION_ERROR');
    }
    if (err instanceof mongoose.Error.ValidationError) {
        error = handleValidationError(err);
    }
    if (err.code === 11000) {
        error = handleDuplicateKeyError(err);
    }
    if (err instanceof Joi.ValidationError) {
        error = handleJoiValidationError(err);
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        error = handleJWTError();
    }
    // Send error response
    res.status(error.statusCode || 500).json({
        status: error.status || 'error',
        code: error.code || 'SERVER_ERROR',
        message: error.isOperational ?
            error.message :
            NODE_ENV === 'production' ?
                SAFE_ERROR_MESSAGES.SERVER_ERROR :
                error.message,
        ...(NODE_ENV === 'development' && {
            error: err,
            stack: err.stack,
        }),
    });
};
export { notFound, errorHandler };
