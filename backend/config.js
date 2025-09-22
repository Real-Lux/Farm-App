// Database configuration with fallback options
const config = {
  // Try local MongoDB first, then fallback to cloud
  getMongoURI: () => {
    // You can replace this with your actual MongoDB Atlas connection string
    // For testing, we'll use a local fallback
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/farm-app';
  },
  
  // Alternative: Use SQLite for development (no MongoDB required)
  useSQLite: process.env.USE_SQLITE === 'true',
  
  // Development mode
  isDevelopment: process.env.NODE_ENV === 'development',
};

module.exports = config; 