const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['damaged', 'wrong item', 'expired', 'other'],
    required: true
  },
  refundAmount: { type: Number, required: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Return', returnSchema);
