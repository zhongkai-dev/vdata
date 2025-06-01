const express = require('express');
const { login, checkRole } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/check-role', checkRole);

module.exports = router; 