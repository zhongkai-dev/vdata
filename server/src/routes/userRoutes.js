const express = require('express');
const { 
  createUser, 
  getUsers, 
  getUserProfile,
  generatePhoneNumbers
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Admin routes
router.post('/', protect, admin, createUser);
router.get('/', protect, admin, getUsers);

// User routes
router.get('/profile', protect, getUserProfile);
router.post('/generate-numbers', protect, generatePhoneNumbers);

module.exports = router; 