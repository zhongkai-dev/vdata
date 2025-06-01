const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Check for both environment variable names
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/phone-number-generator';
    
    console.log('Connecting to MongoDB with URI:', mongoURI.substring(0, 20) + '...');
    
    // Set mongoose options
    mongoose.set('strictQuery', false); // Preparation for Mongoose 7
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds
      family: 4, // Force IPv4
      retryWrites: true,
      w: 'majority', // Write concern for MongoDB Atlas
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Error details:', {
      code: error.code,
      name: error.name,
      // Don't log the full error stack in production
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
    
    // Don't exit the process in production/serverless environment
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB; 