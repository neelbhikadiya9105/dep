const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('owner', 'manager'));

// GET /api/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { storeId } = req.query;
    const saleFilter = {};
    const invFilter = {};
    const userFilter = { role: { $in: ['manager', 'staff'] }, status: 'approved' };

    if (storeId) {
      saleFilter.storeId = storeId;
      invFilter.storeId = storeId;
      userFilter.storeId = storeId;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allSales, inventory, staffCount] = await Promise.all([
      Sale.find(saleFilter),
      Inventory.find(invFilter).populate('productId', 'price'),
      User.countDocuments(userFilter),
    ]);

    const dailySales = allSales.filter((s) => new Date(s.createdAt) >= startOfDay);
    const monthlySales = allSales.filter((s) => new Date(s.createdAt) >= startOfMonth);

    const dailyRevenue = dailySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthlyRevenue = monthlySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const salesCount = allSales.length;

    const inventoryValue = inventory.reduce((sum, inv) => {
      const price = inv.productId?.price || 0;
      return sum + price * inv.quantity;
    }, 0);
    const lowStockCount = inventory.filter((inv) => inv.quantity <= inv.threshold).length;

    res.json({ dailyRevenue, monthlyRevenue, salesCount, inventoryValue, lowStockCount, staffCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/sales
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod, storeId } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    if (storeId) filter.storeId = storeId;

    const sales = await Sale.find(filter)
      .populate('employeeId', 'name')
      .sort({ createdAt: -1 });

    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalOrders = sales.length;
    // Estimate profit as 20% of revenue for demo
    const totalProfit = totalRevenue * 0.2;
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

    res.json({
      sales,
      summary: { totalRevenue, totalOrders, totalProfit, profitMargin }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
