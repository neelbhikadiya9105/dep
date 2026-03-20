const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
  quantity: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['defective', 'wrong_item', 'others'],
    required: true
  },
  refundAmount: { type: Number, required: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Prevent duplicate returns for the same item in the same sale
returnSchema.index({ saleId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Return', returnSchema);
