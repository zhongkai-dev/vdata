// Add dotenv for environment variables
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const fs = require('fs');
const mongoose = require('mongoose');
const { testConnection } = require('./utils/dbTest');
const { testAtlasConnectivity } = require('./utils/networkTest');

// Create uploads directory if it doesn't exist
try {
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (error) {
  console.log('Unable to create uploads directory, continuing anyway');
}

// Connect to database
connectDB().catch(err => {
  console.error('Initial DB connection failed:', err.message);
});

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [
    'https://vdata-one.vercel.app',
    'https://vdata-z-k.vercel.app',
    /\.vercel\.app$/
  ] : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Increase JSON payload limit to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

// Debug endpoint to check MongoDB connection and environment variables
app.get('/api/debug', async (req, res) => {
  // Get MongoDB URI
  const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/phone-number-generator';
  
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    MONGO_URI: mongoURI ? `${mongoURI.substring(0, 20)}...` : 'Not set',
    PORT: process.env.PORT,
    JWT_SECRET: process.env.JWT_SECRET ? 'Set (hidden)' : 'Not set'
  };

  const dbState = {
    mongoose_connected: mongoose.connection.readyState === 1,
    mongoose_readyState: mongoose.connection.readyState,
    mongoose_host: mongoose.connection.host || 'Not connected',
    mongoose_name: mongoose.connection.name || 'Not connected',
  };
  
  // Test direct connection
  const directTest = await testConnection(mongoURI);
  
  // Test network connectivity
  const networkTest = await testAtlasConnectivity(mongoURI);

  res.status(200).json({
    environment: envVars,
    database: dbState,
    directTest,
    networkTest,
    message: 'This endpoint helps debug connection issues',
    vercel: process.env.VERCEL === '1' ? 'Running on Vercel' : 'Not on Vercel',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Ensure correct content type for API responses
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Serve static files from the React app when in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  const clientBuildPath = path.join(__dirname, '../../client/build');
  console.log('Serving static files from:', clientBuildPath);
  app.use(express.static(clientBuildPath));

  // Any routes not caught by API will be handled by React
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
  });
} else {
  // Home route (for API testing in development)
  app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

const PORT = process.env.PORT || 5000;

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Handle 404s for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// For Vercel serverless functions
module.exports = app; 