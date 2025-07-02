# Farm-App

A comprehensive mobile application for farm management, featuring product accounting, date tracking, and booking functionality. Built with React Native for cross-platform compatibility (iOS and Android).

## 🚀 Features

### Core Functionality
- **Product Management**: Track inventory, harvests, and sales
- **Date Tracking**: Monitor planting dates, harvest schedules, and maintenance
- **Booking System**: Manage customer orders and delivery scheduling
- **Dashboard**: Real-time overview of farm operations

### Product Accounting
- Inventory tracking with quantities and categories
- Cost analysis and profit margins
- Sales history and trends
- Product lifecycle management

### Date Management
- Planting and harvest calendars
- Maintenance scheduling
- Weather integration
- Seasonal planning tools

### Booking System
- Customer order management
- Delivery scheduling
- Payment tracking
- Customer database

## 📱 Mobile App Architecture

### Technology Stack
- **Frontend**: React Native (iOS & Android)
- **Backend**: Node.js with Express
- **Database**: MongoDB/PostgreSQL
- **Authentication**: JWT tokens
- **State Management**: Redux Toolkit
- **UI Framework**: React Native Elements

### Project Structure
```
Farm-App/
├── mobile/                 # React Native app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── navigation/     # Navigation configuration
│   │   ├── services/       # API services
│   │   ├── store/          # Redux store
│   │   └── utils/          # Helper functions
│   ├── android/            # Android-specific files
│   └── ios/                # iOS-specific files
├── backend/                # Node.js API server
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   └── utils/          # Helper functions
│   └── package.json
└── docs/                   # Documentation
```

## 🛠️ Development Setup

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- MongoDB or PostgreSQL

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Farm-App.git
   cd Farm-App
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your environment variables
   npm run dev
   ```

3. **Mobile App Setup**
   ```bash
   cd mobile
   npm install
   npx react-native run-android  # For Android
   npx react-native run-ios      # For iOS
   ```

## 📋 Key Screens & Features

### 1. Dashboard
- Overview of current inventory
- Upcoming tasks and deadlines
- Recent sales and bookings
- Weather information

### 2. Products Management
- Add/edit product categories
- Track inventory levels
- Set pricing and costs
- View product history

### 3. Calendar View
- Planting and harvest schedules
- Maintenance reminders
- Booking calendar
- Seasonal planning

### 4. Booking System
- Customer order creation
- Delivery scheduling
- Payment processing
- Order history

### 5. Reports & Analytics
- Sales reports
- Inventory analysis
- Profit/loss statements
- Performance metrics

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

### Mobile App Configuration
Update `mobile/src/config/api.js`:
```javascript
export const API_BASE_URL = 'http://your-backend-url:3000/api';
```

## 🚀 Deployment

### Backend Deployment
1. Deploy to cloud platform (Heroku, AWS, DigitalOcean)
2. Set environment variables
3. Configure database connection
4. Set up SSL certificates

### Mobile App Deployment
1. **Android**: Generate signed APK and upload to Google Play Store
2. **iOS**: Archive and upload to App Store Connect

## 📱 App Features Walkthrough

### For Farmers
1. **Product Management**
   - Add new products with categories
   - Track quantities and costs
   - Monitor expiration dates
   - Set pricing strategies

2. **Schedule Management**
   - Plan planting schedules
   - Track harvest dates
   - Set maintenance reminders
   - Weather integration

3. **Customer Management**
   - Manage customer database
   - Process orders
   - Schedule deliveries
   - Track payments

### For Customers
1. **Product Browsing**
   - View available products
   - Check prices and availability
   - Read product descriptions

2. **Ordering System**
   - Place orders
   - Select delivery dates
   - Make payments
   - Track order status

## 🔒 Security Features
- JWT authentication
- Role-based access control
- Data encryption
- Secure API endpoints
- Input validation

## 📊 Data Models

### Product Schema
```javascript
{
  id: String,
  name: String,
  category: String,
  quantity: Number,
  unit: String,
  price: Number,
  cost: Number,
  plantingDate: Date,
  harvestDate: Date,
  status: String
}
```

### Booking Schema
```javascript
{
  id: String,
  customerId: String,
  products: Array,
  totalAmount: Number,
  deliveryDate: Date,
  status: String,
  paymentStatus: String
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Email: support@farm-app.com
- Documentation: [docs.farm-app.com](https://docs.farm-app.com)

## 🗺️ Roadmap

### Phase 1 (MVP)
- [x] Basic product management
- [x] Simple booking system
- [x] Date tracking
- [ ] User authentication

### Phase 2
- [ ] Advanced analytics
- [ ] Weather integration
- [ ] Payment processing
- [ ] Push notifications

### Phase 3
- [ ] Multi-language support
- [ ] Offline functionality
- [ ] Advanced reporting
- [ ] Integration with external services

---

**Farm-App** - Streamlining farm management for the modern farmer 🌾
