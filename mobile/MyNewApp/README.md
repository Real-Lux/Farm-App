# 🌾 Farm App - Offline Capable Mobile Application

A React Native/Expo application for farm management with offline data storage and CSV export capabilities.

## 🚀 Features

- **Offline First**: All data stored locally on device using SQLite
- **Product Management**: Add, edit, delete products with inventory tracking
- **Order Management**: Track customer orders and delivery status
- **Calendar Events**: Schedule and track farm activities
- **Data Export**: Export data to CSV format
- **Backup & Restore**: Full database backup functionality
- **No Internet Required**: Works completely offline

## 📱 Installation Options

### Option 1: Development (Expo Go)
```bash
npm start
# Scan QR code with Expo Go app
```

### Option 2: Production APK (Standalone App)

#### Method A: Using Expo EAS Build (Recommended)
1. Create free Expo account at https://expo.dev
2. Login: `eas login`
3. Build APK: `eas build --platform android --profile preview`
4. Download and install APK on any Android device

#### Method B: Local Build (Advanced)
1. Install Android Studio
2. Set up Android SDK
3. Run: `npx expo run:android`
4. APK will be generated in `android/app/build/outputs/apk/`

### Option 3: Web App (Browser Access)
```bash
npx expo start --web
# Access via browser at localhost:8081
```

## 🗄️ Database Schema

The app uses SQLite with the following tables:

- **products**: Product inventory management
- **orders**: Customer order tracking
- **order_items**: Order line items
- **calendar_events**: Farm activity scheduling

## 📤 Data Export Features

- **CSV Export**: Export any table to CSV format
- **Backup**: Complete database backup as JSON
- **Share**: Share exported files via email, cloud storage, etc.

## 🔧 Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## 📦 Dependencies

- `expo-sqlite`: Local database storage
- `expo-file-system`: File operations
- `expo-sharing`: Share exported files
- `expo-document-picker`: Import data files
- `expo-router`: Navigation
- `react-native`: Core framework

## 🎯 Usage Instructions

1. **Add Products**: Navigate to Products tab, tap "+ Add Product"
2. **Manage Orders**: Use Orders tab to track customer orders
3. **Schedule Events**: Calendar tab for farm activity planning
4. **Export Data**: Dashboard → Data Export section
5. **Backup**: Dashboard → "Backup All Data" button

## 🔒 Data Security

- All data stored locally on device
- No cloud sync (privacy-focused)
- Export/backup for data portability
- No internet connection required

## 📱 Distribution

### For Personal Use
- Build APK and install directly on devices
- Share APK file via email, USB, or cloud storage

### For Multiple Users
- Upload to Google Play Store (requires developer account)
- Use internal distribution via EAS Build
- Deploy as Progressive Web App (PWA)

## 🛠️ Customization

- Modify `src/services/database.js` for schema changes
- Update screens in `src/screens/` for UI changes
- Configure app settings in `app.json`

## 📞 Support

For issues or questions:
1. Check the console logs for error messages
2. Verify database permissions on device
3. Ensure sufficient storage space for data

## 🔄 Updates

To update the app:
1. Build new APK with updated code
2. Install new APK (data will be preserved)
3. Or use backup/restore for data migration

---

**Note**: This app is designed for offline use. All data is stored locally and will persist between app updates.
