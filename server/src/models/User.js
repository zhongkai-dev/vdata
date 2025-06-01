const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    // 6 digit number
    validate: {
      validator: function(v) {
        return /^\d{6}$/.test(v);
      },
      message: props => `${props.value} is not a valid 6-digit user ID!`
    }
  },
  name: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  phoneNumbersAssigned: {
    type: Number,
    default: 0
  },
  phoneNumbersUsed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Method to check if user is admin
UserSchema.methods.isUserAdmin = function() {
  return this.isAdmin;
};

const User = mongoose.model('User', UserSchema);

module.exports = User; 