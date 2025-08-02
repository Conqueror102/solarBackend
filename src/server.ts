
/**
 * server.js - Entry point of the Solar E-commerce Backend
 * -------------------------------------
 * This file initializes the Express server, connects to MongoDB,
 * sets up middlewares, routes, error handling, and starts the server.
 */

import express, { Application } from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { swaggerUi, swaggerDocs } from './utils/swagger.js';
import { fileURLToPath } from 'url';
import { startDailySalesReportCron } from './cron/dailySalesReport.js';
import { startNotificationCleanupCron } from './cron/notificationCleanup.js';



// Load environment variables
dotenv.config();

// Environment variable checks
const requiredEnv = [
  'MONGO_URI',
  'JWT_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLIC_KEY'
];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error('Missing required environment variables:', missingEnv.join(', '));
  process.exit(1);
}

// Initialize Express app
const app: Application = express();


// Middleware: enable CORS
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://your-frontend-domain.com'] 
      : ['http://localhost:8080'],
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
  };
  app.use(cors(corsOptions));
  
// Connect to MongoDB
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// Middleware: parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware: parse cookies
app.use(cookieParser());

// Middleware: security headers
app.use(helmet());



// Middleware: logging (Morgan)
const accessLogStream = fs.createWriteStream(path.join(logDirectory, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Swagger documentation
if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve static files (e.g., product images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// Optional: fallback error handler
app.use(notFound);
app.use(errorHandler);

// Start cron jobs
startDailySalesReportCron();
startNotificationCleanupCron();

// Server listening
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown
function shutdown() {
    console.log('Received shutdown signal, closing server...');
    server.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(0);
    });
    // Force exit if not closed in 10 seconds
    setTimeout(() => {
        console.error('Force exiting after 10 seconds.');
        process.exit(1);
    }, 10000);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
