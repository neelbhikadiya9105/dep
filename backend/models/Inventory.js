const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    quantity: { type: Number, required: true, default: 0 },
    threshold: { type: Number, default: 10 },
    updatedAt: { type: Date, default: Date.now }
  }
);

inventorySchema.index({ productId: 1, storeId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
