const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['superuser', 'owner', 'manager', 'staff'], default: 'staff' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended', 'deactivated'],
    default: 'pending'
  },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  mustChangePassword: { type: Boolean, default: false },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  // Superuser role & permissions
  superuserRole: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperuserRole', default: null },
  // Profile & preferences
  displayName: { type: String, default: '' },
  avatar: { type: String, default: '' },
  currency: { type: String, enum: ['INR', 'USD', 'EUR', 'GBP'], default: 'INR' },
});

// Regex that matches a bcrypt hash: $2a$, $2b$, or $2y$ prefix followed by cost + 53-char hash
const BCRYPT_HASH_REGEX = /^\$2[ayb]\$\d{2}\$.{53}$/;

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  // Skip re-hashing if the value is already a valid bcrypt hash (e.g., pre-hashed from AccessRequest)
  if (this.passwordHash && BCRYPT_HASH_REGEX.test(this.passwordHash)) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
