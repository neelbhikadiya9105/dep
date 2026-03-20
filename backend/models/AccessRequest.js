const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  businessName: { type: String, default: '' },
  message: { type: String, default: '' },
  // passwordHash stores the bcrypt hash of the owner-chosen password at submission time
  passwordHash: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
