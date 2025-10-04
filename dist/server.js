/**
 * server.js - Entry point of the Solar E-commerce Backend
 * -------------------------------------
 * This file initializes the Express server, connects to MongoDB,
 * sets up middlewares, routes, error handling, and starts the server.
 */
import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
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
import webhookHandler from './routes/payments.routes.js';
import { swaggerUi, swaggerDocs } from './utils/swagger.js';
import { fileURLToPath } from 'url';
import { startDailySalesReportCron } from './cron/dailySalesReport.js';
import { startNotificationCleanupCron } from './cron/notificationCleanup.js';
import { rawBodyParser } from './controllers/payments.controller.js';
import paymentsRouter from "./routes/payments.routes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import brandRoutes from './routes/brandRoutes.js';
import { checkRedisConnectivity } from './infra/redisHealth.js';
import { bullBoardRouter } from './infra/bullBoard.js';
// Load environment variables
dotenv.config();
// Environment variable checks
const requiredEnv = [
    'REDIS_URL',
    'MONGO_URI',
    'JWT_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
    console.error('Missing required environment variables:', missingEnv.join(', '));
    process.exit(1);
}
// Initialize Express app
const app = express();
app.set("trust proxy", 1);
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
// Middleware: security headers
app.use(helmet());
// Middleware: enable CORS
const allowedOrigins = [
    "https://solar-admin-vista.vercel.app",
    "http://localhost:8080", // local dev
    "http://localhost:3000", // local dev
    "http://localhost:3001", // local dev
    "https://onye-solar.vercel.app", // deployed frontend
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE, PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
// Middleware: logging (Morgan)
const accessLogStream = fs.createWriteStream(path.join(logDirectory, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
// Rate limiting (now trust proxy is already set)
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);
// Swagger documentation
if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}
// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/paystack", paymentsRouter);
// Webhook AFTER json parser, with raw body:
app.post("/api/paystack/webhook", rawBodyParser, webhookHandler);
// Serve static files (e.g., product images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/health/redis', async (_req, res) => {
    try {
        const ok = await checkRedisConnectivity();
        res.status(ok ? 200 : 500).json({ ok });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e?.message });
    }
});
app.use('/admin/queues', bullBoardRouter);
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "API is running",
    });
});
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
