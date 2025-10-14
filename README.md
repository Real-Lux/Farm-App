# Farm-App 🚀

A complete farm management application with mobile app and backend API.

## 🚀 Quick Start

### Install Everything
```bash
npm run install:all
```

### 📱 Mobile App (Expo - Hot Reloading Enabled!)
```bash
# Start development server with hot reloading
npm run mobile

####################################################
####################### USING ######################
####################################################
# Or use Expo CLI directly with cache clearing:
npx expo start --clear

# Or run specific platforms:
npm run mobile:android    # Android emulator
npm run mobile:ios        # iOS simulator  
npm run mobile:web        # Browser (great for testing!)
```

**📱 Testing on Your Phone:**
1. Install "Expo Go" app from Play Store/App Store
2. Run `npm run mobile`
3. Scan the QR code with Expo Go
4. **Changes will auto-refresh on your phone!** 🔄

### 🖥️ Backend API Server
```bash
npm run backend        # Development server (auto-restart)
# OR
npm run backend:start  # Production server

# Server runs at: http://localhost:3000
# Health check: http://localhost:3000/api/health
```

## 🎨 Development & Customization

### Mobile App Structure
- **Main App**: `mobile/MyNewApp/App.js`
- **Screens**: `mobile/MyNewApp/src/screens/`
  - DashboardScreen.js - Farm overview & stats
  - ProductManagementScreen.js - Add/edit products
  - DateTrackingScreen.js - Calendar & scheduling
  - BookingSystemScreen.js - Order management
- **Colors**: `mobile/MyNewApp/constants/Colors.ts`
- **Database**: `mobile/MyNewApp/src/services/database.js`

### Backend Structure
- **API Routes**: `backend/src/routes/`
- **Database Models**: `backend/src/models/`
- **Authentication**: `backend/src/middleware/auth.js`

## ⚡ Environment Setup
```bash
# Backend environment
cp backend/env.example backend/.env
# Edit .env with your MongoDB URI and other configs
```

## 🔥 Hot Reloading Features
- **Mobile**: Changes auto-refresh on phone/emulator
- **Web**: Browser auto-refreshes like a website
- **Backend**: Auto-restarts on file changes

## 📦 Production Build
To build production artifacts for the mobile app:
```bash

####################################################
####################### USING ######################
####################################################
# Build Android production APK/AAB
$env:EAS_NO_VCS="1"; $env:EAS_PROJECT_ROOT="."; eas build -p android --profile production
```

---
**💡 Perfect for rapid development and testing!**