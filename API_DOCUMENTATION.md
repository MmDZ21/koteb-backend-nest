# Medical Books Marketplace API Documentation

## Overview

This is a comprehensive REST API for a medical books marketplace platform where users can buy and sell medical books. The platform includes identity verification, wallet management, order processing, review system, and admin controls.

## Base URL

```
http://localhost:3000
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

```json
{
  "data": {}, // or [] for arrays
  "message": "Success message", // optional
  "pagination": { // for paginated responses
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Error Format

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "bio": "Medical student",
  "profilePic": "https://example.com/profile.jpg"
}
```

**Response:**
```json
{
  "message": "registered",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Login User
**POST** `/auth/login`

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "jwt-token-here"
}
```

### Get User Profile
**GET** `/auth/me`

Get current user's profile information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "userId": "uuid",
  "email": "john@example.com",
  "role": "USER"
}
```

---

## User Management

### Get All Users
**GET** `/users/all`

Get paginated list of users.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name or email

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "isVerified": true,
      "isSeller": true,
      "isSellerVerified": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Get User by ID
**GET** `/users/:id`

Get specific user by ID.

### Get User by Email
**GET** `/users/email/:email`

Get specific user by email.

### Update User
**PUT** `/users/:id`

Update user information.

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "+1234567890",
  "bio": "Updated bio",
  "profilePic": "https://example.com/new-profile.jpg"
}
```

### Delete User
**DELETE** `/users/:id`

Delete user account.

---

## Books/Editions Management

### Get All Books
**GET** `/books`

Get paginated list of book editions.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by title, authors, or publisher

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Medical Physiology",
      "subtitle": "A Comprehensive Guide",
      "authors": ["Dr. Smith", "Dr. Johnson"],
      "publisher": "Medical Press",
      "publishedYear": 2023,
      "language": "English",
      "description": "Comprehensive medical physiology textbook",
      "pageCount": 800,
      "coverKey": "covers/medical-physiology.jpg",
      "authorsRel": [
        {
          "id": "uuid",
          "name": "Dr. Smith",
          "slug": "dr-smith"
        }
      ],
      "_count": {
        "listings": 5,
        "reviews": 12
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Search Books
**GET** `/books/search`

Search books with advanced filtering.

**Query Parameters:**
- `q`: Search query
- `page` (optional): Page number
- `limit` (optional): Items per page

### Get Book by ID
**GET** `/books/:id`

Get detailed book information including listings and reviews.

### Create Book
**POST** `/books`

Create a new book edition.

**Request Body:**
```json
{
  "title": "Medical Physiology",
  "subtitle": "A Comprehensive Guide",
  "authors": ["Dr. Smith", "Dr. Johnson"],
  "publisher": "Medical Press",
  "publishedYear": 2023,
  "language": "English",
  "description": "Comprehensive medical physiology textbook",
  "pageCount": 800,
  "coverKey": "covers/medical-physiology.jpg"
}
```

### Update Book
**PATCH** `/books/:id`

Update book information.

### Delete Book
**DELETE** `/books/:id`

Delete book edition.

---

## Authors Management

### Get All Authors
**GET** `/authors`

Get paginated list of authors.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search by name or slug

### Get Author by ID
**GET** `/authors/:id`

Get author details with their books.

### Get Author by Slug
**GET** `/authors/slug/:slug`

Get author details by slug.

### Create Author
**POST** `/authors`

Create a new author.

**Request Body:**
```json
{
  "name": "Dr. John Smith",
  "slug": "dr-john-smith",
  "bio": "Renowned medical author"
}
```

### Update Author
**PATCH** `/authors/:id`

Update author information.

### Delete Author
**DELETE** `/authors/:id`

Delete author.

---

## Listings Management

### Get All Listings
**GET** `/listings`

Get paginated list of book listings.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search by title, authors, or seller
- `status` (optional): Filter by status (DRAFT, PENDING, APPROVED, REJECTED)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "editionId": "uuid",
      "sellerId": "uuid",
      "price": 150.00,
      "currency": "IRR",
      "condition": "LIKE_NEW",
      "conditionNote": "Minor wear on cover",
      "quantity": 1,
      "location": "Tehran, Iran",
      "status": "APPROVED",
      "edition": {
        "id": "uuid",
        "title": "Medical Physiology",
        "authors": ["Dr. Smith"]
      },
      "seller": {
        "id": "uuid",
        "name": "John Doe",
        "isSellerVerified": true
      },
      "images": [
        {
          "id": "uuid",
          "key": "listings/book1.jpg",
          "altText": "Book cover",
          "order": 0
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Get My Listings
**GET** `/listings/my-listings`

Get current user's listings.

**Headers:** `Authorization: Bearer <token>`

### Get Listing by ID
**GET** `/listings/:id`

Get detailed listing information.

### Create Listing
**POST** `/listings`

Create a new book listing.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "editionId": "uuid",
  "price": 150.00,
  "currency": "IRR",
  "condition": "LIKE_NEW",
  "conditionNote": "Minor wear on cover",
  "quantity": 1,
  "location": "Tehran, Iran"
}
```

### Update Listing
**PATCH** `/listings/:id`

Update listing information.

**Headers:** `Authorization: Bearer <token>`

### Delete Listing
**DELETE** `/listings/:id`

Delete listing.

**Headers:** `Authorization: Bearer <token>`

### Approve Listing (Admin)
**PATCH** `/listings/:id/approve`

Approve a pending listing.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "adminNote": "Approved after review"
}
```

### Reject Listing (Admin)
**PATCH** `/listings/:id/reject`

Reject a pending listing.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "adminNote": "Poor condition, needs better photos"
}
```

---

## Orders Management

### Get All Orders
**GET** `/orders`

Get paginated list of orders.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status (CREATED, PAID, SHIPPED, COMPLETED, CANCELLED, REFUNDED)

### Get My Orders
**GET** `/orders/my-orders`

Get current user's orders as buyer.

**Headers:** `Authorization: Bearer <token>`

### Get Seller Orders
**GET** `/orders/seller-orders`

Get current user's orders as seller.

**Headers:** `Authorization: Bearer <token>`

### Get Order by ID
**GET** `/orders/:id`

Get detailed order information.

**Headers:** `Authorization: Bearer <token>`

### Create Order
**POST** `/orders`

Create a new order.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "items": [
    {
      "listingId": "uuid",
      "editionId": "uuid",
      "sellerId": "uuid",
      "quantity": 1
    }
  ],
  "shippingAddrId": "uuid",
  "shippingAmount": 10.00,
  "platformFee": 5.00
}
```

**Response:**
```json
{
  "id": "uuid",
  "buyerId": "uuid",
  "subtotal": 150.00,
  "shippingAmount": 10.00,
  "platformFee": 5.00,
  "totalAmount": 165.00,
  "currency": "IRR",
  "status": "CREATED",
  "items": [
    {
      "id": "uuid",
      "listingId": "uuid",
      "editionId": "uuid",
      "sellerId": "uuid",
      "quantity": 1,
      "unitPrice": 150.00,
      "lineTotal": 150.00,
      "sellerPayout": 142.50,
      "platformFee": 7.50,
      "listing": {
        "edition": {
          "title": "Medical Physiology"
        }
      },
      "seller": {
        "name": "John Doe",
        "isSellerVerified": true
      }
    }
  ],
  "buyer": {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane@example.com"
  },
  "shippingAddr": {
    "line1": "123 Main St",
    "city": "Tehran",
    "country": "Iran"
  }
}
```

### Update Order Status
**PATCH** `/orders/:id/status`

Update order status.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "SHIPPED"
}
```

### Cancel Order
**PATCH** `/orders/:id/cancel`

Cancel an order.

**Headers:** `Authorization: Bearer <token>`

---

## Wallet Management

### Get Wallet
**GET** `/wallet`

Get current user's wallet information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "balance": 1000.00,
  "currency": "IRR",
  "txns": [
    {
      "id": "uuid",
      "type": "DEPOSIT",
      "amount": 1000.00,
      "balanceAfter": 1000.00,
      "createdAt": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### Get Wallet Transactions
**GET** `/wallet/transactions`

Get wallet transaction history.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

### Deposit Money
**POST** `/wallet/deposit`

Add money to wallet.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 1000.00,
  "currency": "IRR",
  "paymentMethod": "bank_transfer"
}
```

### Withdraw Money
**POST** `/wallet/withdraw`

Request money withdrawal.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 500.00,
  "currency": "IRR",
  "bankInfo": "{\"bankName\":\"Melli Bank\",\"accountNumber\":\"1234567890\",\"iban\":\"IR123456789012345678901234\"}"
}
```

### Get Withdraw Requests
**GET** `/wallet/withdraw-requests`

Get all withdrawal requests (Admin).

**Headers:** `Authorization: Bearer <token>`

### Get My Withdraw Requests
**GET** `/wallet/my-withdraw-requests`

Get current user's withdrawal requests.

**Headers:** `Authorization: Bearer <token>`

### Process Withdraw Request (Admin)
**PATCH** `/wallet/withdraw-requests/:id/process`

Approve or reject withdrawal request.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "approved": true,
  "adminNote": "Approved after verification"
}
```

---

## Reviews Management

### Get All Reviews
**GET** `/reviews`

Get paginated list of reviews.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `targetUserId` (optional): Filter by target user
- `editionId` (optional): Filter by edition

### Get My Reviews
**GET** `/reviews/my-reviews`

Get current user's reviews.

**Headers:** `Authorization: Bearer <token>`

### Get Reviews for User
**GET** `/reviews/user/:userId`

Get reviews for a specific user.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "authorId": "uuid",
      "targetUserId": "uuid",
      "rating": 5,
      "title": "Great seller!",
      "comment": "Fast shipping, book in excellent condition",
      "createdAt": "2023-01-01T00:00:00Z",
      "author": {
        "id": "uuid",
        "name": "Jane Smith",
        "profilePic": "https://example.com/profile.jpg"
      }
    }
  ],
  "averageRating": 4.5,
  "totalReviews": 10,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "pages": 1
  }
}
```

### Get Reviews for Edition
**GET** `/reviews/edition/:editionId`

Get reviews for a specific book edition.

### Get Review by ID
**GET** `/reviews/:id`

Get specific review details.

### Create Review
**POST** `/reviews`

Create a new review.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "targetUserId": "uuid",
  "editionId": "uuid",
  "rating": 5,
  "title": "Excellent book!",
  "comment": "Very comprehensive and well-written"
}
```

### Update Review
**PATCH** `/reviews/:id`

Update review.

**Headers:** `Authorization: Bearer <token>`

### Delete Review
**DELETE** `/reviews/:id`

Delete review.

**Headers:** `Authorization: Bearer <token>`

---

## Support System

### Get All Tickets
**GET** `/support/tickets`

Get all support tickets (Admin).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status (OPEN, PENDING, RESOLVED, CLOSED)
- `priority` (optional): Filter by priority (LOW, MEDIUM, HIGH, URGENT)

### Get My Tickets
**GET** `/support/my-tickets`

Get current user's support tickets.

**Headers:** `Authorization: Bearer <token>`

### Get Ticket by ID
**GET** `/support/tickets/:id`

Get detailed ticket information.

**Headers:** `Authorization: Bearer <token>`

### Create Ticket
**POST** `/support/tickets`

Create a new support ticket.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Order not received",
  "description": "I placed an order 2 weeks ago but haven't received it",
  "category": "order_issue",
  "tags": ["order", "shipping"],
  "priority": "MEDIUM"
}
```

### Update Ticket Status
**PATCH** `/support/tickets/:id/status`

Update ticket status.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "RESOLVED"
}
```

### Assign Ticket (Admin)
**PATCH** `/support/tickets/:id/assign`

Assign ticket to admin.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "assigneeId": "admin-uuid"
}
```

### Add Message to Ticket
**POST** `/support/tickets/:id/messages`

Add message to support ticket.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "body": "Thank you for your help!"
}
```

### Get Ticket Messages
**GET** `/support/tickets/:id/messages`

Get messages for a ticket.

**Headers:** `Authorization: Bearer <token>`

---

## Admin Management

### Get Dashboard
**GET** `/admin/dashboard`

Get admin dashboard statistics.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "users": {
    "total": 1000,
    "verified": 800,
    "pending": 200
  },
  "listings": {
    "total": 500,
    "pending": 50,
    "approved": 450
  },
  "orders": {
    "total": 2000,
    "completed": 1800,
    "pending": 200
  },
  "revenue": {
    "total": 50000.00
  },
  "withdrawals": {
    "pending": 25
  }
}
```

### Get All Users (Admin)
**GET** `/admin/users`

Get all users with admin filters.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search by name or email
- `verified` (optional): Filter by verification status

### Get Pending Verifications
**GET** `/admin/verifications/pending`

Get pending user verifications.

**Headers:** `Authorization: Bearer <token>`

### Verify User
**PATCH** `/admin/verifications/:userId`

Approve or reject user verification.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "APPROVED",
  "adminNote": "Documents verified successfully"
}
```

### Get Pending Listings
**GET** `/admin/listings/pending`

Get pending book listings.

**Headers:** `Authorization: Bearer <token>`

### Approve Listing (Admin)
**PATCH** `/admin/listings/:id/approve`

Approve a listing.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "adminNote": "Approved after review"
}
```

### Reject Listing (Admin)
**PATCH** `/admin/listings/:id/reject`

Reject a listing.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "adminNote": "Poor quality images"
}
```

### Get Recent Activity
**GET** `/admin/activity`

Get recent admin activity logs.

**Headers:** `Authorization: Bearer <token>`

---

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## Enums

### User Roles
- `USER` - Regular user
- `ADMIN` - Administrator

### Verification Status
- `PENDING` - Awaiting review
- `APPROVED` - Approved
- `REJECTED` - Rejected

### Book Status
- `DRAFT` - Not submitted for review
- `PENDING` - Awaiting admin approval
- `APPROVED` - Approved and visible
- `REJECTED` - Rejected by admin

### Book Condition
- `NEW` - Brand new
- `LIKE_NEW` - Excellent condition
- `VERY_GOOD` - Very good condition
- `GOOD` - Good condition
- `ACCEPTABLE` - Acceptable condition

### Order Status
- `CREATED` - Order created
- `PAID` - Payment received
- `SHIPPED` - Order shipped
- `COMPLETED` - Order completed
- `CANCELLED` - Order cancelled
- `REFUNDED` - Order refunded

### Ticket Status
- `OPEN` - New ticket
- `PENDING` - Awaiting response
- `RESOLVED` - Issue resolved
- `CLOSED` - Ticket closed

### Ticket Priority
- `LOW` - Low priority
- `MEDIUM` - Medium priority
- `HIGH` - High priority
- `URGENT` - Urgent

### Transaction Types
- `DEPOSIT` - Money deposited
- `WITHDRAW` - Money withdrawn
- `ORDER_PAYMENT` - Payment for order
- `SALE_INCOME` - Income from sale
- `REFUND` - Refund processed
- `ADJUSTMENT` - Manual adjustment

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 100 requests per minute per IP for public endpoints
- 1000 requests per minute per authenticated user

## Pagination

Most list endpoints support pagination with these parameters:
- `page`: Page number (starts from 1)
- `limit`: Items per page (default: 10, max: 100)

## Search

Search endpoints support:
- Full-text search across relevant fields
- Case-insensitive matching
- Partial string matching

## File Uploads

For file uploads (profile pictures, listing images, support attachments):
- Maximum file size: 5MB
- Allowed formats: JPG, PNG, PDF
- Files are stored in cloud storage and referenced by key

## Webhooks

The API supports webhooks for:
- Order status changes
- Payment confirmations
- User verification status changes
- Listing approval/rejection

## SDKs and Libraries

Official SDKs available for:
- JavaScript/Node.js
- Python
- PHP
- Java

## Support

For API support:
- Email: api-support@medicalbooks.com
- Documentation: https://docs.medicalbooks.com
- Status Page: https://status.medicalbooks.com
