const mongoose = require('mongoose');

// Direct test of MongoDB connection
const testConnection = async (uri) => {
  console.log('Testing direct MongoDB connection...');
  
  // Check if URI is valid
  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    return {
      success: false,
      error: 'Invalid MongoDB URI: URI is empty or not a string',
      code: 'INVALID_URI'
    };
  }
  
  let testConn;
  try {
    // Validate URI format
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      return {
        success: false,
        error: 'Invalid MongoDB URI format: URI must start with mongodb:// or mongodb+srv://',
        code: 'INVALID_URI_FORMAT'
      };
    }
    
    console.log('Connecting to MongoDB with URI format:', 
      uri.substring(0, uri.indexOf('://') + 6) + 
      (uri.includes('@') ? '[username]:[password]@' + uri.substring(uri.indexOf('@') + 1, 30) : uri.substring(0, 30)) + 
      '...');
    
    // Force a new connection for testing
    testConn = await mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
      socketTimeoutMS: 10000, // 10 seconds socket timeout
      connectTimeoutMS: 10000, // 10 seconds connect timeout
    });
    
    // Check if connection is established
    await testConn.asPromise();
    
    // Additional connection validation
    const isConnected = testConn.readyState === 1;
    if (!isConnected) {
      throw new Error('Connection created but not in connected state');
    }
    
    const result = {
      success: true,
      host: testConn.host || 'unknown',
      name: testConn.name || 'unknown',
      readyState: testConn.readyState,
      message: 'Successfully connected to MongoDB'
    };
    
    return result;
  } catch (error) {
    console.error('MongoDB test connection error:', error.message);
    
    // Categorize common MongoDB connection errors
    let errorType = 'Unknown Error';
    if (error.name === 'MongoServerSelectionError') {
      errorType = 'Server Selection Error';
    } else if (error.name === 'MongoNetworkError') {
      errorType = 'Network Error';
    } else if (error.message.includes('authentication failed')) {
      errorType = 'Authentication Error';
    } else if (error.message.includes('ENOTFOUND')) {
      errorType = 'Host Not Found';
    } else if (error.message.includes('timed out')) {
      errorType = 'Timeout Error';
    }
    
    return {
      success: false,
      error: error.message,
      errorType,
      code: error.code,
      name: error.name,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    };
  } finally {
    // Always close the test connection if it was created
    if (testConn) {
      try {
        await testConn.close();
        console.log('Test connection closed successfully');
      } catch (closeError) {
        console.error('Error closing test connection:', closeError.message);
      }
    }
  }
};

module.exports = { testConnection }; 