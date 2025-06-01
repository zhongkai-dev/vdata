const mongoose = require('mongoose');

const PhoneNumberSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isAssigned: {
    type: Boolean,
    default: false
  },
  assignedUser: {
    type: String,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

const PhoneNumber = mongoose.model('PhoneNumber', PhoneNumberSchema);

module.exports = PhoneNumber; 