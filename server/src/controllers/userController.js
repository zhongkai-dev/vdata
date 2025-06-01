const User = require('../models/User');
const PhoneNumber = require('../models/PhoneNumber');

// Create a new user (admin only)
const createUser = async (req, res) => {
  try {
    const { userId, name, phoneNumbersAssigned } = req.body;
    
    // Check if user ID already exists
    const userExists = await User.findOne({ userId });
    if (userExists) {
      return res.status(400).json({ message: 'User ID already exists' });
    }

    // Create new user
    const user = await User.create({
      userId,
      name,
      phoneNumbersAssigned: phoneNumbersAssigned || 0
    });

    res.status(201).json({
      userId: user.userId,
      name: user.name,
      phoneNumbersAssigned: user.phoneNumbersAssigned,
      phoneNumbersUsed: user.phoneNumbersUsed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({
      userId: user.userId,
      name: user.name,
      phoneNumbersAssigned: user.phoneNumbersAssigned,
      phoneNumbersUsed: user.phoneNumbersUsed,
      phoneNumbersRemaining: user.phoneNumbersAssigned - user.phoneNumbersUsed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate phone numbers for user
const generatePhoneNumbers = async (req, res) => {
  try {
    const { count } = req.body;
    const userId = req.user.userId;
    
    if (!count || parseInt(count) <= 0) {
      return res.status(400).json({ message: 'Please provide a valid count' });
    }
    
    // Get user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has enough assigned phone numbers
    const phoneNumbersRemaining = user.phoneNumbersAssigned - user.phoneNumbersUsed;
    if (count > phoneNumbersRemaining) {
      return res.status(400).json({ message: 'Not enough phone numbers allocated to this user' });
    }
    
    // Find phone numbers that are assigned to this specific user
    const availablePhoneNumbers = await PhoneNumber.find({ 
      isAssigned: true, 
      assignedUser: userId 
    }).limit(count);
    
    if (availablePhoneNumbers.length === 0) {
      return res.status(400).json({ 
        message: 'No phone numbers assigned to your user. Please ask the administrator to assign more phone numbers.'
      });
    }
    
    if (availablePhoneNumbers.length < count) {
      return res.status(400).json({ 
        message: `Only ${availablePhoneNumbers.length} phone numbers assigned to your user. Please ask the administrator to assign more phone numbers.`
      });
    }
    
    const phoneNumbersToReturn = [];
    const phoneNumberIds = [];
    
    // Get the phone numbers to return
    for (const phoneNumber of availablePhoneNumbers) {
      phoneNumbersToReturn.push(phoneNumber.number);
      phoneNumberIds.push(phoneNumber._id);
    }
    
    // Update user's used phone numbers count
    user.phoneNumbersUsed += phoneNumbersToReturn.length;
    await user.save();
    
    // Permanently delete the phone numbers from the database after they've been given to the user
    await PhoneNumber.deleteMany({ _id: { $in: phoneNumberIds } });
    
    // Remove plus signs from the phone numbers if they exist
    const formattedPhoneNumbers = phoneNumbersToReturn.map(number => number.replace(/\+/g, ''));
    
    res.status(200).json({ 
      count: phoneNumbersToReturn.length,
      phoneNumbers: formattedPhoneNumbers
    });
  } catch (error) {
    console.error('Error generating phone numbers:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserProfile,
  generatePhoneNumbers
}; 