const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('owner', 'manager'));

// GET /api/reports/sales
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod } = req.query;
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
