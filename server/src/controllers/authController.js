const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Login user
const login = async (req, res) => {
  try {
    const { userId } = req.body;

    // Input validation
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.userId, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '8h' }
    );

    res.status(200).json({
      userId: user.userId,
      name: user.name,
      isAdmin: user.isAdmin,
      phoneNumbersAssigned: user.phoneNumbersAssigned,
      phoneNumbersUsed: user.phoneNumbersUsed,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login process',
      error: error.message 
    });
  }
};

// Check if a user is an admin
const checkRole = async (req, res) => {
  try {
    const { userId } = req.body;

    // Input validation
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return if user is admin
    res.status(200).json({
      isAdmin: user.isAdmin
    });
  } catch (error) {
    console.error('Check role error:', error);
    res.status(500).json({ 
      message: 'Server error while checking user role',
      error: error.message 
    });
  }
};

module.exports = {
  login,
  checkRole
}; 