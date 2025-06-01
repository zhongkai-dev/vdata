const mongoose = require('mongoose');
const User = require('./src/models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://datashare:datashare@cluster0.bakem1f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB Connected');
    
    // Check if admin exists
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      console.log('Admin user already exists with ID:', adminExists.userId);
    } else {
      // Create admin user
      const admin = await User.create({
        userId: '000000', // Default admin ID
        name: 'Admin',
        isAdmin: true
      });
      
      console.log('Admin user created successfully with ID:', admin.userId);
    }
    
    // Disconnect
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Run the function
connectDB(); 