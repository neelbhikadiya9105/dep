const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      sku: String,
      qty: Number,
      price: Number
    }
  ],
  totalAmount: { type: Number, required: true },
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card'], required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: { type: String, default: 'Walk-in' },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
  receiptNumber: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sale', saleSchema);
