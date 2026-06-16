# TotalFix27x7 Backend

Express.js backend for a multi-service TotalFix27x7 platform with, JWT authentication, Razorpay integration, and role-based access control.

## 📋 Features

✅ **Authentication System**

- JWT-based authentication
- Role-based access control (Client, Employee, Admin)
- Secure password hashing with bcryptjs
- Token verification middleware

✅ **Database**

- Relational schema with foreign keys
- Row-Level Security (RLS) policies
- Indexes for performance optimization

✅ **Booking System**

- Double booking prevention
- Automatic employee assignment
- Booking status workflow management
- Available time slot generation

✅ **Payment Integration**

- Razorpay payment gateway integration
- Order creation and verification
- Payment signature validation
- Refund support

✅ **REST APIs**

- Complete CRUD operations
- Comprehensive error handling
- Input validation with Zod
- Async error middleware

✅ **Admin Dashboard**

- User management
- Booking analytics
- Revenue tracking
- Employee performance stats

✅ **Security**

- CORS configuration
- Protected routes with middleware
- SQL injection prevention
- XSS protection via headers

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Razorpay account

## ❌ Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (double booking, duplicate email)
- `500` - Internal Server Error

## 🧪 Testing the APIs

### Using cURL

```bash
# Signup
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "password": "SecurePass123!",
    "role": "client"
  }'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Get services
curl http://localhost:5000/api/v1/services

# Create booking (with token)
curl -X POST http://localhost:5000/api/v1/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "<id>",
    "booking_date": "2024-02-20",
    "time_slot": {"start_time": "10:00", "end_time": "12:00"}
  }'
```

### Using Postman

1. Import the API endpoints
2. Set Authorization header: `Bearer <your-token>`
3. Test each endpoint

## 🔒 Security Best Practices

✅ **Implemented**

- JWT token validation on protected routes
- Role-based access control middleware
- Password hashing with bcryptjs
- CORS protection
- Input validation with Zod
- Error messages don't leak sensitive info

⚠️ **For Production**

- Use HTTPS only
- Set strong JWT_SECRET (min 32 chars)
- Configure rate limiting
- Add request logging
- Setup monitoring/alerts
- Regular security audits
- Use environment-specific configs
- Implement API key rotation

## 📈 Performance

- Database indexes on frequently queried columns
- Async/await for non-blocking operations
- Error middleware catches unhandled rejections
- CORS headers optimized

## 🚀 Deployment

### Heroku / Railway

1. Push code to git
2. Add environment variables
3. Run migrations
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```bash
docker build -t totalfix27x7-api .
docker run -p 5000:5000 totalfix27x7-api
```

## 📚 Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Express.js Guide](https://expressjs.com/)
- [Razorpay Integration](https://razorpay.com/docs/api/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)

## 📝 License

ISC

## 👥 Support

For issues or questions, please create an issue in the repository.
