# Trading Education Platform - E-commerce + LMS

## System Architecture

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **File Storage**: Cloudinary
- **Payment**: Stripe (with local payment methods: Easypaisa, Jazz Cash)
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io for live sessions
- **State Management**: Zustand
- **UI**: Tailwind CSS + Shadcn/ui

### Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (Next.js)     │◄──►│  (Node.js/      │◄──►│   (MongoDB)     │
│                 │    │   Express)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Payment       │    │   File Storage  │    │   Live Streaming│
│   Gateway       │    │   (Cloudinary)  │    │   (WebRTC)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Database Schema

### 1. User Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String (required),
  lastName: String (required),
  role: String (enum: ['student', 'instructor', 'admin']),
  isVerified: Boolean (default: false),
  profileImage: String (Cloudinary URL),
  phone: String,
  country: String (default: 'Pakistan'),
  paymentMethod: String (enum: ['credit_card', 'easypaisa', 'jazz_cash']),
  subscription: {
    plan: String (enum: ['free', 'basic', 'premium']),
    startDate: Date,
    endDate: Date,
    isActive: Boolean
  },
  promoCode: {
    code: String,
    appliedAt: Date,
    discount: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Course Collection
```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String (required),
  instructor: ObjectId (ref: 'User'),
  price: Number (required),
  currency: String (default: 'USD'),
  thumbnail: String (Cloudinary URL),
  videos: [{
    title: String,
    description: String,
    videoUrl: String (Cloudinary URL),
    duration: Number,
    order: Number
  }],
  category: String (enum: ['forex', 'crypto', 'stocks', 'commodities']),
  level: String (enum: ['beginner', 'intermediate', 'advanced']),
  rating: Number (default: 0),
  totalRatings: Number (default: 0),
  enrolledStudents: [ObjectId] (ref: 'User'),
  isPublished: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Live Session Collection
```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String,
  instructor: ObjectId (ref: 'User'),
  scheduledAt: Date (required),
  duration: Number (minutes),
  maxParticipants: Number,
  currentParticipants: [ObjectId] (ref: 'User'),
  meetingLink: String,
  recordingUrl: String (Cloudinary URL),
  status: String (enum: ['scheduled', 'live', 'completed', 'cancelled']),
  price: Number,
  isFree: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Trading Signal Collection
```javascript
{
  _id: ObjectId,
  instructor: ObjectId (ref: 'User'),
  symbol: String (required),
  type: String (enum: ['buy', 'sell', 'hold']),
  entryPrice: Number,
  targetPrice: Number,
  stopLoss: Number,
  description: String,
  timeframe: String (enum: ['1m', '5m', '15m', '1h', '4h', '1d']),
  confidence: Number (1-100),
  status: String (enum: ['active', 'hit_target', 'hit_stop_loss', 'closed']),
  subscribers: [ObjectId] (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Payment Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User'),
  amount: Number (required),
  currency: String (default: 'USD'),
  paymentMethod: String (enum: ['credit_card', 'easypaisa', 'jazz_cash']),
  status: String (enum: ['pending', 'completed', 'failed', 'refunded']),
  transactionId: String,
  description: String,
  type: String (enum: ['signup', 'course_purchase', 'session_booking', 'subscription']),
  relatedItem: {
    type: String (enum: ['course', 'session', 'subscription']),
    id: ObjectId
  },
  promoCode: String,
  discount: Number,
  finalAmount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### 6. Promo Code Collection
```javascript
{
  _id: ObjectId,
  code: String (unique, required),
  description: String,
  discountType: String (enum: ['percentage', 'fixed']),
  discountValue: Number,
  maxUses: Number,
  currentUses: Number,
  validFrom: Date,
  validUntil: Date,
  isActive: Boolean (default: true),
  applicableTo: [String] (enum: ['signup', 'course', 'session', 'all']),
  createdAt: Date
}
```

## Implementation Plan

### Phase 1: Backend Setup (Week 1-2)
1. Initialize Node.js + Express project
2. Set up MongoDB connection with Mongoose
3. Implement user authentication (JWT)
4. Create user management APIs
5. Set up Cloudinary integration
6. Implement payment gateway (Stripe + local methods)

### Phase 2: Core Features (Week 3-4)
1. Course management APIs
2. Live session management
3. Trading signals system
4. File upload/download with Cloudinary
5. Payment processing

### Phase 3: Frontend Development (Week 5-7)
1. Next.js project setup
2. Authentication pages (login/signup)
3. User dashboard
4. Course marketplace
5. Live session booking
6. Trading signals dashboard

### Phase 4: Real-time Features (Week 8)
1. WebRTC integration for live sessions
2. Socket.io for real-time updates
3. Live chat during sessions

### Phase 5: Testing & Deployment (Week 9-10)
1. Unit and integration tests
2. Performance optimization
3. Deployment setup
4. Security hardening

## Scaling Recommendations

### Short-term (3-6 months)
- Implement Redis for session management
- Add CDN for static assets
- Implement rate limiting
- Add comprehensive logging

### Medium-term (6-12 months)
- Microservices architecture
- Multiple instructor support
- Advanced analytics dashboard
- Mobile app development
- Multi-language support

### Long-term (1+ years)
- AI-powered course recommendations
- Advanced trading analytics
- Social learning features
- Enterprise solutions
- International expansion

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run development server: `npm run dev`

## Environment Variables Required

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Server
PORT=5000
NODE_ENV=development
```
