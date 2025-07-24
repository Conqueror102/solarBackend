
/**
 * swagger.js - Swagger API Documentation Setup
 * --------------------------------------------
 * Provides interactive API documentation using Swagger UI.
 */
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Solar E-commerce API',
            version: '1.0.0',
            description: 'API documentation for the Solar E-commerce backend',
            contact: {
                name: 'Yx.GG Team',
            },
        },
        servers: [
            {
                url: 'http://localhost:5008/api',
            },
        ],
    },
    apis: ['./routes/*.ts'], // Update to .ts for TypeScript
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

export { swaggerUi, swaggerDocs };
