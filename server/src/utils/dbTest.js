const mongoose = require('mongoose');

// Direct test of MongoDB connection
const testConnection = async (uri) => {
  console.log('Testing direct MongoDB connection...');
  
  try {
    // Force a new connection for testing
    const testConn = await mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout
    });
    
    // Check if connection is established
    await testConn.asPromise();
    
    const result = {
      success: true,
      host: testConn.host,
      name: testConn.name,
      message: 'Successfully connected to MongoDB'
    };
    
    // Close test connection
    await testConn.close();
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      name: error.name,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    };
  }
};

module.exports = { testConnection }; 