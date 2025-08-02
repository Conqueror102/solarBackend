/**
 * server.ts - Server Configuration
 * --------------------------------
 * Handles server configuration for different environments
 */

export const getServerConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    // Trust proxy configuration
    trustProxy: isProduction ? 1 : false,
    
    // Rate limiting configuration
    rateLimit: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: isProduction ? 100 : 1000, // More lenient in development
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many requests from this IP, please try again later.'
      },
      // Custom key generator to handle proxy headers properly
      keyGenerator: (req: any) => {
        // Use X-Forwarded-For if available, otherwise use remote address
        const forwardedFor = req.headers['x-forwarded-for'];
        if (forwardedFor) {
          // Take the first IP in the chain (client IP)
          return forwardedFor.toString().split(',')[0].trim();
        }
        return req.ip || req.connection.remoteAddress || 'unknown';
      }
    },
    
    // CORS configuration
    cors: {
      origin: isProduction 
        ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    
    // Helmet configuration
    helmet: {
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    },
    
    // Environment-specific settings
    environment: {
      isProduction,
      isDevelopment,
      port: process.env.PORT || 5000,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  };
}; 