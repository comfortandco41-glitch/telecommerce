# API.md - REST API Reference Specification

This document provides a detailed reference of the backend REST endpoints, required payloads, and JSON response formats.

---

## 1. Global JSON Envelope

All API responses follow a structured envelope:

### Success Response
```json
{
  "success": true,
  "data": {} // Payload varies by endpoint
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed: stock must be a non-negative integer.",
    "details": {
      "stock": ["Must be greater than or equal to 0"]
    }
  }
}
```

---

## 2. Authentication Endpoints

### Register Merchant
- **Route**: `POST /api/v1/auth/register`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "merchant@example.com",
    "password": "SecurePassword123!",
    "name": "Alex Mercer"
  }
  ```
- **Response Data (HTTP 201)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "merchant": {
        "id": "e6a4b163-d34e-4f71-a477-d5d1c23f79a1",
        "email": "merchant@example.com",
        "name": "Alex Mercer"
      }
    }
  }
  ```

### Login Merchant
- **Route**: `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "merchant@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response Data (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

---

## 3. Shops & Bot Config

All subsequent endpoints require the Header: `Authorization: Bearer <JWT_TOKEN>`

### Create Shop
- **Route**: `POST /api/v1/shops`
- **Request Body**:
  ```json
  {
    "name": "My Retro Shop",
    "botToken": "1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ",
    "currency": "USD",
    "paymentInstructions": "Transfer to bank account XYZ",
    "welcomeMessage": "Welcome to Retro Shop! Pick a category below."
  }
  ```
- **Response (HTTP 201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "8b08e2d4-1a3b-417c-a49e-ecdfbd69b2d8",
      "name": "My Retro Shop",
      "botUsername": "MyRetroShopBot",
      "isActive": true
    }
  }
  ```

---

## 4. Products & Categories

### Create Category
- **Route**: `POST /api/v1/shops/:shopId/categories`
- **Request Body**:
  ```json
  {
    "name": "Vinyl Records",
    "description": "Classic vinyl collections"
  }
  ```
- **Response (HTTP 201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "c71b0db7-739c-4613-8a35-2efcde85a440",
      "name": "Vinyl Records"
    }
  }
  ```

### Create Product
- **Route**: `POST /api/v1/shops/:shopId/products`
- **Request Body**:
  ```json
  {
    "categoryId": "c71b0db7-739c-4613-8a35-2efcde85a440",
    "name": "Pink Floyd - Dark Side",
    "description": "Original remastered press",
    "price": 29.99,
    "stock": 15,
    "images": ["https://mybucket.supabase.co/storage/v1/object/public/products/pinkfloyd.jpg"]
  }
  ```

---

## 5. Orders & CRM

### Get Orders (Filtered by Status)
- **Route**: `GET /api/v1/shops/:shopId/orders?status=PENDING_VERIFICATION`
- **Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "fc406ba1-0fb8-410a-b0f3-0a75d506d338",
        "status": "PENDING_VERIFICATION",
        "totalAmount": 29.99,
        "deliveryAddress": "123 Main St, New York",
        "deliveryPhone": "+123456789",
        "bankScreenshotUrl": "receipts/fc406ba1-receipt.jpg",
        "customer": {
          "firstName": "John",
          "username": "johndoe"
        }
      }
    ]
  }
  ```

### Update Order Status (Verification Action)
- **Route**: `PATCH /api/v1/shops/:shopId/orders/:orderId/status`
- **Request Body**:
  ```json
  {
    "status": "PAID"
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "fc406ba1-0fb8-410a-b0f3-0a75d506d338",
      "status": "PAID",
      "invoicePdfUrl": "https://mybucket.supabase.co/storage/v1/object/public/invoices/fc406ba1-invoice.pdf"
    }
  }
  ```
  *(Note: Triggering this status change automatically calls the Invoice generation worker, sends the PDF to the user's Telegram ID, and updates the DB).*
