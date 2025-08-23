# Trading Education Platform - Setup Guide

## 🚀 Quick Start

This guide will help you set up the complete Trading Education Platform (E-commerce + LMS) on your local machine.

## 📋 Prerequisites

- **Node.js** (v18.0.0 or higher)
- **MongoDB** (v5.0 or higher)
- **npm** or **yarn**
- **Git**

## 🛠️ Installation Steps

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd trading-education-platform
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Environment Configuration

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/trading-education-platform

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Cloudinary (sign up at cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe (sign up at stripe.com)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 5. Database Setup

Start MongoDB service:

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
# Start MongoDB service from Services
```

Create the database:

```bash
mongosh
use trading-education-platform
```

### 6. Start the Backend

```bash
npm run dev
```

The backend will start on `http://localhost:5000`

### 7. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

## 🔧 Configuration Details

### MongoDB Setup

1. **Install MongoDB Community Edition**
   - [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

2. **Create Database User** (Optional but recommended for production)
   ```javascript
   use admin
   db.createUser({
     user: "trading_user",
     pwd: "secure_password",
     roles: [{ role: "readWrite", db: "trading-education-platform" }]
   })
   ```

### Cloudinary Setup

1. **Sign up** at [cloudinary.com](https://cloudinary.com)
2. **Get your credentials** from Dashboard
3. **Configure environment variables**

### Stripe Setup

1. **Sign up** at [stripe.com](https://stripe.com)
2. **Get API keys** from Dashboard
3. **Configure webhooks** (optional for development)

### Local Payment Methods (Pakistan)

For Easypaisa and Jazz Cash integration:

1. **Easypaisa Business Account**
   - Contact Easypaisa for business integration
   - Get API credentials

2. **Jazz Cash Business Account**
   - Contact Jazz Cash for business integration
   - Get API credentials

## 📁 Project Structure

```
trading-education-platform/
├── models/                 # Database models
│   ├── User.js
│   ├── Course.js
│   ├── LiveSession.js
│   ├── TradingSignal.js
│   ├── Payment.js
│   └── PromoCode.js
├── routes/                 # API routes
│   ├── auth.js
│   ├── users.js
│   ├── courses.js
│   ├── sessions.js
│   ├── signals.js
│   ├── payments.js
│   └── promos.js
├── middleware/             # Custom middleware
│   └── auth.js
├── config/                 # Configuration files
│   ├── cloudinary.js
│   └── stripe.js
├── frontend/               # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   └── styles/            # CSS files
├── server.js              # Main server file
├── package.json           # Backend dependencies
└── README.md              # Project documentation
```

## 🧪 Testing the Setup

### 1. Backend Health Check

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### 2. Frontend Access

Open `http://localhost:3000` in your browser to see the landing page.

### 3. API Testing

Test the registration endpoint:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "paymentMethod": "credit_card"
  }'
```

## 🔐 Default Admin Setup

Create your first admin user:

```bash
# Using MongoDB shell
mongosh trading-education-platform

db.users.insertOne({
  email: "admin@tradeedu.com",
  password: "$2a$12$...", // Use bcrypt to hash password
  firstName: "Admin",
  lastName: "User",
  role: "admin",
  isVerified: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Or use the registration API and manually update the role in the database.

## 🚀 Production Deployment

### 1. Environment Variables

Update `.env` for production:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trading-education-platform
FRONTEND_URL=https://yourdomain.com
```

### 2. Build Frontend

```bash
cd frontend
npm run build
```

### 3. Process Manager

Use PM2 for production:

```bash
npm install -g pm2
pm2 start server.js --name "trading-platform"
pm2 startup
pm2 save
```

### 4. Reverse Proxy

Configure Nginx or Apache to serve the frontend and proxy API requests to the backend.

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB service is running
   - Verify connection string in `.env`
   - Check firewall settings

2. **Port Already in Use**
   - Change port in `.env` file
   - Kill process using the port: `lsof -ti:5000 | xargs kill -9`

3. **Module Not Found Errors**
   - Run `npm install` in both root and frontend directories
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`

4. **Cloudinary Upload Errors**
   - Verify API credentials in `.env`
   - Check file size limits
   - Ensure proper file formats

### Debug Mode

Enable debug logging:

```env
DEBUG=true
LOG_LEVEL=debug
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Course Endpoints

- `GET /api/courses` - List all courses
- `POST /api/courses` - Create new course (instructor only)
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course (owner only)
- `DELETE /api/courses/:id` - Delete course (owner only)

### Live Session Endpoints

- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session (instructor only)
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/:id/book` - Book session

### Trading Signal Endpoints

- `GET /api/signals` - List all signals
- `POST /api/signals` - Create new signal (instructor only)
- `GET /api/signals/:id` - Get signal details
- `POST /api/signals/:id/subscribe` - Subscribe to signal

## 🔒 Security Considerations

1. **JWT Secret**: Use a strong, random secret key
2. **Rate Limiting**: Already configured in the application
3. **Input Validation**: All endpoints use express-validator
4. **CORS**: Configured for security
5. **Helmet**: Security headers enabled
6. **Password Hashing**: Bcrypt with salt rounds

## 📈 Performance Optimization

1. **Database Indexes**: Already configured in models
2. **File Compression**: Enabled with compression middleware
3. **Caching**: Consider implementing Redis for session management
4. **CDN**: Use Cloudinary's CDN for media files
5. **Image Optimization**: Automatic with Cloudinary transformations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For technical support or questions:

- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section above

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Trading! 🚀📈**
