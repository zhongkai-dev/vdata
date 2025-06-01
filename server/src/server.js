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

// MongoDB Atlas specific troubleshooting endpoint
app.get('/api/atlas-check', async (req, res) => {
  try {
    // Process the MongoDB URI
    let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || '';
    
    console.log('Atlas check requested, using URI:', mongoURI ? `${mongoURI.substring(0, 20)}...` : 'Not set');
    
    // Basic URI validation
    if (!mongoURI || mongoURI.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'MongoDB URI is not set in environment variables',
        suggestions: [
          'Set MONGO_URI environment variable in Vercel',
          'Check for typos in the environment variable name'
        ],
        timestamp: new Date().toISOString()
      });
    }
    
    // Add database name if not present
    if (mongoURI.includes('mongodb+srv://')) {
      let hasDatabase = false;
      
      // Check if there's a database name
      const parts = mongoURI.split('@');
      if (parts.length > 1) {
        const pathParts = parts[1].split('/');
        hasDatabase = pathParts.length > 1 && pathParts[1] && pathParts[1].length > 0 && !pathParts[1].startsWith('?');
      }
      
      // Add database if missing
      if (!hasDatabase) {
        if (mongoURI.includes('/?')) {
          mongoURI = mongoURI.replace('/?', '/vdata?');
        } else if (mongoURI.endsWith('/')) {
          mongoURI = `${mongoURI}vdata`;
        } else {
          mongoURI = `${mongoURI}/vdata`;
        }
        console.log('Added database name to URI:', mongoURI ? `${mongoURI.substring(0, 20)}...` : 'Not set');
      }
    }
    
    // Extract some information about the URI
    let uriInfo = {
      isAtlas: mongoURI.includes('mongodb+srv://'),
      hasCredentials: mongoURI.includes('@'),
      hasDatabase: false,
      hasParameters: mongoURI.includes('?'),
    };
    
    // Try to extract host and database information
    try {
      if (uriInfo.hasCredentials && mongoURI.includes('@')) {
        const parts = mongoURI.split('@');
        if (parts.length > 1) {
          const hostAndPath = parts[1].split('/');
          uriInfo.host = hostAndPath[0];
          
          // Check for database name
          if (hostAndPath.length > 1 && hostAndPath[1] && hostAndPath[1].length > 0 && !hostAndPath[1].startsWith('?')) {
            uriInfo.hasDatabase = true;
            uriInfo.database = hostAndPath[1].split('?')[0];
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing MongoDB URI:', parseError);
      // Continue with diagnostics even if parsing fails
    }
    
    // Test basic connection (with timeout)
    let directConnTest;
    try {
      directConnTest = await Promise.race([
        testConnection(mongoURI),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection test timeout after 10s')), 10000)
        )
      ]);
    } catch (err) {
      directConnTest = {
        success: false,
        error: err.message,
        code: err.code,
        name: err.name
      };
    }
    
    // Test network connectivity (with timeout)
    let networkTest;
    try {
      networkTest = await Promise.race([
        testAtlasConnectivity(mongoURI),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network test timeout after 10s')), 10000)
        )
      ]);
    } catch (err) {
      networkTest = {
        success: false,
        error: err.message
      };
    }
    
    // Check Mongoose connection status
    const mongooseStatus = {
      readyState: mongoose.connection.readyState,
      connected: mongoose.connection.readyState === 1,
      host: mongoose.connection.host || 'Not connected',
      message: getMongooseReadyStateMessage(mongoose.connection.readyState)
    };
    
    // Compile troubleshooting suggestions
    const suggestions = [];
    
    if (!directConnTest.success) {
      if (directConnTest.error && directConnTest.error.includes('authentication failed')) {
        suggestions.push('Authentication failed. Check username and password in your MongoDB connection string.');
      }
      
      if (directConnTest.error && directConnTest.error.includes('ENOTFOUND')) {
        suggestions.push('Hostname not found. Verify the MongoDB Atlas hostname is correct.');
      }
      
      if (directConnTest.error && directConnTest.error.includes('connection timed out')) {
        suggestions.push('Connection timed out. Your IP address might not be in the MongoDB Atlas IP allowlist.');
        suggestions.push('Add 0.0.0.0/0 to your MongoDB Atlas IP allowlist temporarily for testing.');
      }
      
      if (!uriInfo.hasDatabase) {
        suggestions.push('No database name specified in the URI. Add a database name after the hostname.');
      }
    }
    
    if (!networkTest || !networkTest.success) {
      if (!networkTest || !networkTest.tests || !networkTest.tests.dnsLookup || !networkTest.tests.dnsLookup.success) {
        suggestions.push('DNS lookup failed. Check if the hostname is correct.');
      }
      
      if (!networkTest || !networkTest.tests || !networkTest.tests.tcpConnection || !networkTest.tests.tcpConnection.success) {
        suggestions.push('TCP connection failed. This could be due to firewall restrictions or IP allowlist settings.');
      }
    }
    
    if (suggestions.length === 0 && !mongooseStatus.connected) {
      suggestions.push('MongoDB connection is not established. Try restarting the server.');
    }
    
    // Always add this suggestion if there are problems
    if (suggestions.length > 0) {
      suggestions.push('For MongoDB Atlas: Go to Network Access in Atlas dashboard and add current IP or 0.0.0.0/0 (allow from anywhere) for testing.');
    }
    
    return res.status(200).json({
      uriInfo,
      directConnectionTest: directConnTest,
      networkTest,
      mongooseStatus,
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/atlas-check:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
      timestamp: new Date().toISOString()
    });
  }
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

// Helper function to get readable Mongoose connection state
function getMongooseReadyStateMessage(state) {
  switch (state) {
    case 0: return 'Disconnected';
    case 1: return 'Connected';
    case 2: return 'Connecting';
    case 3: return 'Disconnecting';
    default: return 'Unknown';
  }
}

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