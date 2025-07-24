

# Solar E-commerce Backend (Node.js + Express + MongoDB)

## Overview
This is the backend for the Solar E-commerce Admin Dashboard. It provides REST APIs for authentication, product management, order processing, and payment integration using Stripe.

---

## Features
- JWT-based Authentication and Admin Role Support
- CRUD APIs for Solar Products
- Order Management (Create, View, Payment)
- Stripe Payment Integration
- Image Upload with Multer and Cloudinary
- Secure and Scalable (Helmet, Rate Limiting, CORS)
- MVC Folder Structure
- Centralized Error Handling

---

## Requirements
- Node.js (>= 14)
- MongoDB (Cloud/Local)
- Cloudinary Account
- Stripe Account (Secret Key)

---

## Environment Variables
Create a `.env` file in the root directory with the following variables:
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/solar_ecommerce
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
```

---

## Installation
1. Clone the repository:
   ```bash
   git clone <repo_url>
   cd solar-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

---

## API Endpoints
### Auth
- `POST /api/auth/register` – Register user
- `POST /api/auth/login` – Login user
- `GET /api/auth/profile` – Get profile (requires token)

### Products
- `GET /api/products` – List products
- `POST /api/products` – Add product (Admin)
- `PUT /api/products/:id` – Update product (Admin)
- `DELETE /api/products/:id` – Delete product (Admin)

### Orders
- `POST /api/orders` – Create order
- `GET /api/orders/myorders` – Get user orders
- `POST /api/orders/pay` – Process payment

---

## Integrating with Frontend
- Set the API base URL in your frontend to point to this backend (`http://localhost:5008/api`).
- Use JWT token from `/login` for authenticated requests.

---

## Deployment
- Use services like Heroku, Railway, or Render.
- Set environment variables on the server.
