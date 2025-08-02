# Product API Guide

## Problem Fixed
The "name is required" error was caused by improper handling of `multipart/form-data` requests. The API now properly handles form data fields.

## API Endpoints

### 1. Create Product
```http
POST /api/products
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Request Body (form-data):**
```
name: "Solar Panel 400W"
description: "High efficiency polycrystalline solar panel"
price: "399.99"
category: "64f8a1b2c3d4e5f6a7b8c9d0"  // Category ObjectId
stock: "25"
images: [file1, file2, file3]  // max 5 files, 2MB each
```

**Response (201):**
```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "name": "Solar Panel 400W",
  "description": "High efficiency polycrystalline solar panel",
  "price": 399.99,
  "category": "64f8a1b2c3d4e5f6a7b8c9d0",
  "stock": 25,
  "images": [
    "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-1.jpg",
    "https://res.cloudinary.com/cloud/image/upload/v123/solar-panel-2.jpg"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Update Product
```http
PUT /api/products/:id
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Request Body (form-data):**
```
name: "Updated Solar Panel 400W"
description: "Updated description"
price: "449.99"
category: "64f8a1b2c3d4e5f6a7b8c9d0"
stock: "30"
images: [file1, file2]  // optional
```

### 3. Get All Products
```http
GET /api/products
```

### 4. Get Product by ID
```http
GET /api/products/:id
```

### 5. Delete Product
```http
DELETE /api/products/:id
Authorization: Bearer <admin_token>
```

### 6. Bulk Operations

#### Bulk Delete
```http
POST /api/products/bulk-delete
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "ids": [
    "64f8a1b2c3d4e5f6a7b8c9d0",
    "64f8a1b2c3d4e5f6a7b8c9d1"
  ]
}
```

#### Bulk Update
```http
PATCH /api/products/bulk-update
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "ids": ["64f8a1b2c3d4e5f6a7b8c9d0"],
  "category": "64f8a1b2c3d4e5f6a7b8c9d1",
  "price": 499.99
}
```

#### Bulk Update Stock
```http
PATCH /api/products/bulk-update-stock
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "ids": ["64f8a1b2c3d4e5f6a7b8c9d0"],
  "setTo": 100
}
```

### 7. Admin Reports
```http
GET /api/products/top-selling
Authorization: Bearer <admin_token>

GET /api/products/low-stock
Authorization: Bearer <admin_token>
```

## Important Notes

### 1. Category Field
- **Must be a valid MongoDB ObjectId** (24-character hex string)
- **Cannot be a string name** - must be the actual category ID
- Example: `"64f8a1b2c3d4e5f6a7b8c9d0"`

### 2. File Upload
- **Content-Type**: Must be `multipart/form-data`
- **Max files**: 5 images
- **Max size**: 2MB per file
- **Allowed types**: JPEG, PNG, WEBP

### 3. Form Data Fields
All fields in `multipart/form-data` are received as strings:
- `price`: Will be converted to number
- `stock`: Will be converted to number
- `category`: Must be valid ObjectId string

### 4. Authentication
- **Admin/Superadmin** required for create/update/delete operations
- **Public access** for read operations

## Testing with Postman

### 1. Create Product
1. Set method to `POST`
2. URL: `{{base_url}}/api/products`
3. Headers: `Authorization: Bearer {{admin_token}}`
4. Body: `form-data`
5. Add fields:
   - `name`: "Test Product"
   - `description`: "Test description"
   - `price`: "99.99"
   - `category`: "64f8a1b2c3d4e5f6a7b8c9d0"
   - `stock`: "10"
   - `images`: [select files]

### 2. Update Product
1. Set method to `PUT`
2. URL: `{{base_url}}/api/products/{{product_id}}`
3. Same form-data structure as create

## Common Issues & Solutions

### 1. "name is required" Error
- **Cause**: Missing name field in form-data
- **Solution**: Ensure `name` field is included in request

### 2. "category is required" Error
- **Cause**: Missing or invalid category ObjectId
- **Solution**: Provide valid 24-character hex string

### 3. "Invalid file type" Error
- **Cause**: Unsupported image format
- **Solution**: Use JPEG, PNG, or WEBP only

### 4. "File too large" Error
- **Cause**: Image exceeds 2MB limit
- **Solution**: Compress or resize image

### 5. Authentication Error
- **Cause**: Missing or invalid admin token
- **Solution**: Login as admin and use valid token

## Example cURL Commands

### Create Product
```bash
curl -X POST "https://your-api.com/api/products" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "name=Solar Panel 400W" \
  -F "description=High efficiency panel" \
  -F "price=399.99" \
  -F "category=64f8a1b2c3d4e5f6a7b8c9d0" \
  -F "stock=25" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"
```

### Update Product
```bash
curl -X PUT "https://your-api.com/api/products/PRODUCT_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "name=Updated Solar Panel" \
  -F "price=449.99" \
  -F "stock=30"
```

## Category Management

Before creating products, ensure you have categories:

### Create Category
```http
POST /api/categories
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Solar Panels",
  "description": "High efficiency solar panels"
}
```

### Get Categories
```http
GET /api/categories
```

Use the returned category ID in product creation/updates. 