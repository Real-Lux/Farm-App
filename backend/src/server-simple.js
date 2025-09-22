const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mock data for testing
const mockUsers = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'farmer',
    isActive: true
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    role: 'customer',
    isActive: true
  }
];

const mockProducts = [
  {
    id: '1',
    name: 'Fresh Tomatoes',
    category: 'vegetables',
    price: 2.50,
    quantity: 50,
    unit: 'kg',
    description: 'Fresh organic tomatoes from local farms',
    farmer: '1',
    isAvailable: true
  },
  {
    id: '2',
    name: 'Organic Carrots',
    category: 'vegetables',
    price: 1.80,
    quantity: 30,
    unit: 'kg',
    description: 'Sweet organic carrots',
    farmer: '1',
    isAvailable: true
  }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Farm-App Backend is running!'
  });
});

// Mock auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = mockUsers.find(u => u.email === email);
  
  if (user && password === 'password123') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { ...user, password: undefined },
        token: 'mock-jwt-token-' + user.id
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  
  const existingUser = mockUsers.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }
  
  const newUser = {
    id: (mockUsers.length + 1).toString(),
    firstName,
    lastName,
    email,
    role: role || 'customer',
    isActive: true
  };
  
  mockUsers.push(newUser);
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: { ...newUser, password: undefined },
      token: 'mock-jwt-token-' + newUser.id
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
  
  const userId = token.replace('mock-jwt-token-', '');
  const user = mockUsers.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  res.json({
    success: true,
    data: {
      user: { ...user, password: undefined }
    }
  });
});

// Mock products endpoints
app.get('/api/products', (req, res) => {
  const { category, search, page = 1, limit = 10 } = req.query;
  
  let filteredProducts = [...mockProducts];
  
  if (category && category !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }
  
  if (search) {
    filteredProducts = filteredProducts.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: {
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredProducts.length / limit),
        totalItems: filteredProducts.length,
        itemsPerPage: parseInt(limit)
      }
    }
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = mockProducts.find(p => p.id === req.params.id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  res.json({
    success: true,
    data: {
      product
    }
  });
});

// Mock bookings endpoints
app.get('/api/bookings', (req, res) => {
  res.json({
    success: true,
    data: {
      bookings: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 10
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Farm-App Backend Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📝 Test Credentials:`);
  console.log(`   Farmer: john@example.com / password123`);
  console.log(`   Customer: jane@example.com / password123`);
});

module.exports = app; 