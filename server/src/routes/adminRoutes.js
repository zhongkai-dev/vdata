const express = require('express');
const multer = require('multer');
const path = require('path');
const { 
  uploadPhoneNumbers, 
  getPhoneNumbers,
  getPhoneNumbersCount,
  assignPhoneNumbersToUser,
  createAdminUser,
  clearAllPhoneNumbers,
  clearAllUserAssignments,
  bulkCreateUsers,
  reconcilePhoneNumberAssignments,
  unassignAllPhoneNumbersAndResetUsers,
  bulkAssignPhoneNumbersToAllUsers,
  deleteUser,
  deleteMultipleUsers,
  clearUsedPhoneNumbers,
  clearAssignedPhoneNumbers,
  clearTotalPhoneNumbers,
  exportUnusedPhoneNumbers
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Filter function to accept only Excel and CSV files
const fileFilter = (req, file, cb) => {
  const filetypes = /xlsx|xls|csv/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only Excel and CSV files are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});

const router = express.Router();

// Public route to create initial admin
router.post('/setup', createAdminUser);

// Protected admin routes
router.post('/upload-numbers', protect, admin, uploadPhoneNumbers);
router.get('/phone-numbers', protect, admin, getPhoneNumbers);
router.get('/phone-numbers/count', protect, admin, getPhoneNumbersCount);
router.post('/assign-numbers', protect, admin, assignPhoneNumbersToUser);
router.delete('/clear-numbers', protect, admin, clearAllPhoneNumbers);
router.delete('/clear-assignments', protect, admin, clearAllUserAssignments);
router.delete('/clear-used-numbers', protect, admin, clearUsedPhoneNumbers);
router.delete('/clear-assigned-numbers', protect, admin, clearAssignedPhoneNumbers);
router.delete('/clear-total-numbers', protect, admin, clearTotalPhoneNumbers);
router.get('/export-unused-numbers', protect, admin, exportUnusedPhoneNumbers);

// New route for reconciling phone number assignments
router.post('/reconcile-assignments', protect, admin, reconcilePhoneNumberAssignments);

// New route to unassign all phone numbers and reset user counts
router.post('/unassign-all-numbers', protect, admin, unassignAllPhoneNumbersAndResetUsers);

// Bulk upload users route
router.post('/bulk-create-users', 
  protect, 
  admin, 
  upload.single('file'), // 'file' is the expected field name in the form
  bulkCreateUsers
);

// New route for bulk assigning phone numbers to all users
router.post('/bulk-assign-to-all', protect, admin, bulkAssignPhoneNumbersToAllUsers);

// New route for deleting a single user
router.delete('/delete-user/:userId', protect, admin, deleteUser);

// New route for deleting multiple users
router.post('/delete-users', protect, admin, deleteMultipleUsers);

module.exports = router; 