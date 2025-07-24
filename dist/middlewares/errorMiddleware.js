/**
 * errorMiddleware.js
 * ------------------
 * Provides centralized error handling for Express applications.
 */
// Not Found Middleware
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};
// Error Handler Middleware
// middlewares/errorMiddleware.ts
;
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};
export default errorHandler;
export { notFound, errorHandler };
