# Solar E-commerce Backend API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Key Corrections from Previous Documentation

### 1. Register Endpoint
**CORRECT**: Register does NOT return a token
- **POST** `/api/auth/register`
- **Response**: Returns user data + message to verify email
- **Note**: User must verify email before they can login

### 2. Login Endpoint  
**CORRECT**: Login returns the JWT token
- **POST** `/api/auth/login`
- **Response**: Returns user data + token

## Detailed JSON Request/Response Formats

### Authentication Endpoints

#### 1. Register User
```json
POST /api/auth/register
Content-Type: application/json

Request Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}

Response (201):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "message": "Registration successful. Please check your email to verify your account."
}
```

#### 2. Login User
```json
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "email": "john@example.com",
  "password": "password123"
}

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Verify Email
```json
POST /api/auth/verify-email
Content-Type: application/json

Request Body:
{
  "email": "john@example.com",
  "token": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"
}

Response (200):
{
  "message": "Email verified successfully. You can now log in."
}
```

#### 4. Forgot Password
```json
POST /api/auth/forgot-password
Content-Type: application/json

Request Body:
{
  "email": "john@example.com"
}

Response (200):
{
  "message": "If that email is registered, a reset link has been sent."
}
```

#### 5. Reset Password
```json
POST /api/auth/reset-password
Content-Type: application/json

Request Body:
{
  "email": "john@example.com",
  "token": "reset_token_here",
  "password": "newpassword123"
}

Response (200):
{
  "message": "Password has been reset successfully"
}
```

#### 6. Get User Profile
```json
GET /api/auth/profile
Authorization: Bearer <token>

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user"
}
```

#### 7. Update User Profile
```json
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "name": "John Updated",
  "email": "john.updated@example.com"
}

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "John Updated",
  "email": "john.updated@example.com",
  "role": "user"
}
```

#### 8. Change Password
```json
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}

Response (200):
{
  "message": "Password updated successfully"
}
```

### Product Endpoints

#### 1. Get All Products
```json
GET /api/products

Response (200):
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Solar Panel 300W",
    "description": "High efficiency monocrystalline solar panel",
    "price": 299.99,
    "category": "Solar Panels",
    "stock": 50,
    "images": [
      "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-1.jpg",
      "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-2.jpg"
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### 2. Get Product by ID
```json
GET /api/products/64f8a1b2c3d4e5f6a7b8c9d0

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Solar Panel 300W",
  "description": "High efficiency monocrystalline solar panel",
  "price": 299.99,
  "category": "Solar Panels",
  "stock": 50,
  "images": [
    "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-1.jpg",
    "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-2.jpg"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 3. Create Product
```json
POST /api/products
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request Body (form-data):
{
  "name": "Solar Panel 400W",
  "description": "High efficiency polycrystalline solar panel",
  "price": 399.99,
  "category": "Solar Panels",
  "stock": 25,
  "images": [file1, file2, file3, file4, file5] // max 5 files, 2MB each
}

Response (201):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Solar Panel 400W",
  "description": "High efficiency polycrystalline solar panel",
  "price": 399.99,
  "category": "Solar Panels",
  "stock": 25,
  "images": [
    "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-400w-1.jpg",
    "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-400w-2.jpg"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 4. Update Product
```json
PUT /api/products/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request Body (form-data):
{
  "name": "Updated Solar Panel 400W",
  "description": "Updated description",
  "price": 449.99,
  "category": "Solar Panels",
  "stock": 30,
  "images": [file1, file2] // optional
}

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Updated Solar Panel 400W",
  "description": "Updated description",
  "price": 449.99,
  "category": "Solar Panels",
  "stock": 30,
  "images": [
    "https://res.cloudinary.com/cloud/image/upload/v123/updated-solar-panel-1.jpg",
    "https://res.cloudinary.com/cloud/image/upload/v123/updated-solar-panel-2.jpg"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 5. Bulk Delete Products
```json
POST /api/products/bulk-delete
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "ids": [
    "64f8a1b2c3d4e5f6a7b8c9d0",
    "64f8a1b2c3d4e5f6a7b8c9d1",
    "64f8a1b2c3d4e5f6a7b8c9d2"
  ]
}

Response (200):
{
  "message": "Products deleted",
  "count": 3
}
```

#### 6. Bulk Update Products
```json
PATCH /api/products/bulk-update
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "ids": [
    "64f8a1b2c3d4e5f6a7b8c9d0",
    "64f8a1b2c3d4e5f6a7b8c9d1"
  ],
  "category": "Premium Solar Panels",
  "price": 499.99
}

Response (200):
{
  "message": "Products updated",
  "count": 2
}
```

#### 7. Bulk Update Stock
```json
PATCH /api/products/bulk-update-stock
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "ids": [
    "64f8a1b2c3d4e5f6a7b8c9d0",
    "64f8a1b2c3d4e5f6a7b8c9d1"
  ],
  "setTo": 100
}

Response (200):
{
  "message": "Stock updated",
  "count": 2,
  "lowStockProducts": [
    {
      "name": "Solar Panel 300W",
      "stock": 5
    }
  ]
}
```

### Order Endpoints

#### 1. Create Order
```json
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "orderItems": [
    {
      "product": "64f8a1b2c3d4e5f6a7b8c9d0",
      "qty": 2,
      "price": 299.99
    },
    {
      "product": "64f8a1b2c3d4e5f6a7b8c9d1",
      "qty": 1,
      "price": 199.99
    }
  ],
  "totalAmount": 799.97,
  "paymentMethod": "stripe",
  "shippingAddress": {
    "address": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "billingAddress": {
    "address": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}

Response (201):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "user": "64f8a1b2c3d4e5f6a7b8c9d0",
  "orderItems": [
    {
      "product": "64f8a1b2c3d4e5f6a7b8c9d0",
      "qty": 2,
      "price": 299.99
    },
    {
      "product": "64f8a1b2c3d4e5f6a7b8c9d1",
      "qty": 1,
      "price": 199.99
    }
  ],
  "totalAmount": 799.97,
  "status": "Pending",
  "paymentMethod": "stripe",
  "isPaid": false,
  "shippingAddress": {
    "address": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "billingAddress": {
    "address": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 2. Get My Orders
```json
GET /api/orders/myorders
Authorization: Bearer <token>

Response (200):
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "orderItems": [
      {
        "product": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
          "name": "Solar Panel 300W",
          "image": "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-1.jpg",
          "price": 299.99
        },
        "qty": 2,
        "price": 299.99
      }
    ],
    "totalAmount": 599.98,
    "status": "Processing",
    "isPaid": true,
    "shippingAddress": {
      "address": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "billingAddress": {
      "address": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }
]
```

#### 3. Pay Order
```json
POST /api/orders/pay
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "orderId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "currency": "usd",
  "source": "pm_card_visa"
}

Response (200):
{
  "success": true,
  "paymentIntent": {
    "id": "pi_1234567890",
    "amount": 79997,
    "currency": "usd",
    "status": "succeeded"
  },
  "order": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "status": "Processing",
    "paymentStatus": "Completed",
    "isPaid": true,
    "paidAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 4. Get All Orders (Admin)
```json
GET /api/orders
Authorization: Bearer <token>

Response (200):
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "shortCode": "#12345",
    "customer": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "date": "2024-01-01T00:00:00.000Z",
    "status": "Processing",
    "total": 799.97,
    "shippingAddress": {
      "address": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "billingAddress": {
      "address": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    }
  }
]
```

#### 5. Update Order (Admin)
```json
PUT /api/orders/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "status": "Shipped",
  "paymentStatus": "Completed"
}

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "status": "Shipped",
  "paymentStatus": "Completed",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Cart Endpoints

#### 1. Get Cart
```json
GET /api/cart
Authorization: Bearer <token>

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "user": "64f8a1b2c3d4e5f6a7b8c9d0",
  "items": [
    {
      "product": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "Solar Panel 300W",
        "price": 299.99,
        "image": "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-1.jpg"
      },
      "quantity": 2
    }
  ]
}
```

#### 2. Add to Cart
```json
POST /api/cart
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "productId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "quantity": 2
}

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "user": "64f8a1b2c3d4e5f6a7b8c9d0",
  "items": [
    {
      "product": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "Solar Panel 300W",
        "price": 299.99,
        "image": "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-1.jpg"
      },
      "quantity": 2
    }
  ]
}
```

#### 3. Update Cart Item
```json
PUT /api/cart/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "quantity": 3
}

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "user": "64f8a1b2c3d4e5f6a7b8c9d0",
  "items": [
    {
      "product": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "Solar Panel 300W",
        "price": 299.99,
        "image": "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-1.jpg"
      },
      "quantity": 3
    }
  ]
}
```

### Category Endpoints

#### 1. Get All Categories
```json
GET /api/categories

Response (200):
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "Solar Panels",
    "description": "High efficiency solar panels"
  },
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "name": "Solar Inverters",
    "description": "Grid-tie and off-grid inverters"
  }
]
```

#### 2. Create Category
```json
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "name": "Solar Batteries",
  "description": "Lithium-ion and lead-acid batteries"
}

Response (201):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
  "name": "Solar Batteries",
  "description": "Lithium-ion and lead-acid batteries"
}
```

### User Management Endpoints

#### 1. Get All Users (Admin)
```json
GET /api/users
Authorization: Bearer <token>

Response (200):
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "isDeactivated": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### 2. Create User (Superadmin)
```json
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin"
}

Response (201):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "admin"
}
```

#### 3. Get User Settings
```json
GET /api/users/settings
Authorization: Bearer <token>

Response (200):
{
  "theme": "dark",
  "notifications": true,
  "language": "en"
}
```

#### 4. Update User Settings
```json
PUT /api/users/settings
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "preferences": {
    "theme": "light",
    "notifications": false,
    "language": "es"
  }
}

Response (200):
{
  "theme": "light",
  "notifications": false,
  "language": "es"
}
```

#### 5. Get User Addresses
```json
GET /api/users/addresses
Authorization: Bearer <token>

Response (200):
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "address": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "isDefault": true
  },
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "address": "456 Oak Avenue",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90210",
    "country": "USA",
    "isDefault": false
  }
]
```

#### 6. Add Address
```json
POST /api/users/addresses
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "address": "789 Pine Street",
  "city": "Chicago",
  "state": "IL",
  "zipCode": "60601",
  "country": "USA"
}

Response (201):
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "address": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "isDefault": true
  },
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "address": "456 Oak Avenue",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90210",
    "country": "USA",
    "isDefault": false
  },
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "address": "789 Pine Street",
    "city": "Chicago",
    "state": "IL",
    "zipCode": "60601",
    "country": "USA",
    "isDefault": false
  }
]
```

### Dashboard Endpoints

#### 1. Get Dashboard Data
```json
GET /api/dashboard
Authorization: Bearer <token>

Response (200):
{
  "totalRevenue": 50000.00,
  "ordersToday": 15,
  "activeCustomers": 45,
  "lowStockItems": 8,
  "salesOverview": [
    {
      "_id": "2024-01-01",
      "total": 1500.00,
      "count": 5
    },
    {
      "_id": "2024-01-02",
      "total": 1800.00,
      "count": 6
    }
  ],
  "orderStatus": {
    "Pending": 10,
    "Processing": 25,
    "Shipped": 15,
    "Delivered": 50
  }
}
```

#### 2. Get Analytics Overview
```json
GET /api/dashboard/analytics/overview?start=2024-01-01&end=2024-01-31
Authorization: Bearer <token>

Response (200):
{
  "totalRevenue": 50000.00,
  "totalRevenueChange": 15.5,
  "aov": 250.00,
  "aovChange": 8.2,
  "totalCustomers": 200,
  "totalCustomersChange": 12.3,
  "conversionRate": 3.2,
  "conversionRateChange": -1.5,
  "trends": {
    "2024-01-01": 1500.00,
    "2024-01-02": 1800.00,
    "2024-01-03": 1200.00
  }
}
```

### Notification Endpoints

#### 1. Get Notifications
```json
GET /api/notifications?page=1&limit=20&read=false&type=order&priority=high
Authorization: Bearer <token>

Response (200):
{
  "notifications": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "recipient": "64f8a1b2c3d4e5f6a7b8c9d0",
      "type": "order",
      "title": "Order Status Update",
      "message": "Your order has been shipped",
      "data": {
        "orderId": "64f8a1b2c3d4e5f6a7b8c9d0",
        "status": "Shipped"
      },
      "priority": "high",
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### 2. Create Notification (Admin)
```json
POST /api/notifications
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "recipientId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "type": "order",
  "title": "Order Update",
  "message": "Your order has been processed",
  "data": {
    "orderId": "64f8a1b2c3d4e5f6a7b8c9d0"
  },
  "priority": "medium",
  "expiresAt": "2024-12-31T23:59:59.000Z"
}

Response (201):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "recipient": "64f8a1b2c3d4e5f6a7b8c9d0",
  "type": "order",
  "title": "Order Update",
  "message": "Your order has been processed",
  "data": {
    "orderId": "64f8a1b2c3d4e5f6a7b8c9d0"
  },
  "priority": "medium",
  "isRead": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Settings Endpoints

#### 1. Get Settings
```json
GET /api/settings
Authorization: Bearer <token>

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "businessName": "Solar Store",
  "businessEmail": "contact@solarstore.com",
  "preferences": {
    "currency": "USD",
    "taxRate": 8.5,
    "shippingCost": 15.00
  }
}
```

#### 2. Update Settings
```json
PUT /api/settings
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "businessName": "Updated Solar Store",
  "businessEmail": "updated@solarstore.com",
  "preferences": {
    "currency": "EUR",
    "taxRate": 10.0,
    "shippingCost": 20.00
  }
}

Response (200):
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "businessName": "Updated Solar Store",
  "businessEmail": "updated@solarstore.com",
  "preferences": {
    "currency": "EUR",
    "taxRate": 10.0,
    "shippingCost": 20.00
  }
}
```

## Complete List of All Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Products (`/api/products`)
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin/Superadmin)
- `PUT /api/products/:id` - Update product (Admin/Superadmin)
- `DELETE /api/products/:id` - Delete product (Admin/Superadmin)
- `GET /api/products/top-selling` - Get top selling products (Admin/Superadmin)
- `GET /api/products/low-stock` - Get low stock products (Admin/Superadmin)
- `POST /api/products/bulk-delete` - Bulk delete products (Admin/Superadmin)
- `PATCH /api/products/bulk-update` - Bulk update products (Admin/Superadmin)
- `PATCH /api/products/bulk-update-stock` - Bulk update stock (Admin/Superadmin)

### Orders (`/api/orders`)
- `GET /api/orders` - Get all orders (Admin/Superadmin)
- `POST /api/orders` - Create order
- `GET /api/orders/myorders` - Get user's orders
- `POST /api/orders/pay` - Pay order
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order (Admin/Superadmin)
- `DELETE /api/orders/:id` - Delete order (Admin/Superadmin)
- `PATCH /api/orders/:id/cancel` - Cancel order

### Cart (`/api/cart`)
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:productId` - Update cart item
- `DELETE /api/cart/:productId` - Remove item from cart
- `DELETE /api/cart` - Clear cart

### Categories (`/api/categories`)
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category (Admin/Superadmin)
- `PUT /api/categories/:id` - Update category (Admin/Superadmin)
- `DELETE /api/categories/:id` - Delete category (Admin/Superadmin)

### Users (`/api/users`)
- `GET /api/users` - Get all users (Admin/Superadmin)
- `GET /api/users/:id` - Get user by ID (Admin/Superadmin)
- `POST /api/users` - Create user (Superadmin)
- `PUT /api/users/:id` - Update user (Superadmin)
- `DELETE /api/users/:id` - Delete user (Superadmin)
- `PATCH /api/users/:id/deactivate` - Deactivate user (Superadmin)
- `PATCH /api/users/:id/reactivate` - Reactivate user (Superadmin)
- `GET /api/users/settings` - Get user settings
- `PUT /api/users/settings` - Update user settings
- `GET /api/users/addresses` - Get user addresses
- `POST /api/users/addresses` - Add address
- `PUT /api/users/addresses/:addressId` - Update address
- `DELETE /api/users/addresses/:addressId` - Delete address
- `PUT /api/users/addresses/:addressId/default` - Set default address
- `GET /api/users/customers/analytics` - Get customer analytics (Admin/Superadmin)
- `POST /api/users/customers/send-email` - Send email to customer (Admin/Superadmin)
- `GET /api/users/customers/:id/profile` - Get customer profile (Admin/Superadmin)

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard` - Get dashboard data (Admin/Superadmin)
- `GET /api/dashboard/analytics/overview` - Get analytics overview (Admin/Superadmin)
- `GET /api/dashboard/sales-performance` - Get sales performance (Admin/Superadmin)
- `GET /api/dashboard/top-products` - Get top products (Admin/Superadmin)
- `POST /api/dashboard/custom-report` - Get custom report (Admin/Superadmin)

### Notifications (`/api/notifications`)
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/stats` - Get notification stats
- `PATCH /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/:id` - Get notification by ID
- `DELETE /api/notifications/:id` - Delete notification
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/:id/unread` - Mark as unread
- `POST /api/notifications` - Create notification (Admin/Superadmin)
- `POST /api/notifications/bulk` - Create bulk notifications (Admin/Superadmin)

### Settings (`/api/settings`)
- `GET /api/settings` - Get settings (Superadmin)
- `PUT /api/settings` - Update settings (Superadmin)

## Environment Variables Required

```env
MONGO_URI=mongodb://localhost:27017/solar-store
JWT_SECRET=your_jwt_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
```

## Total Endpoints: 67 API Endpoints

This documentation accurately reflects your actual code implementation. The key correction is that **register does NOT return a token** - only login does. Users must verify their email before they can login. 