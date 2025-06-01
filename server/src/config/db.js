const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Check for both environment variable names
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/phone-number-generator';
    
    console.log('Connecting to MongoDB with URI:', mongoURI.substring(0, 20) + '...');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Don't exit the process in production/serverless environment
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB; 