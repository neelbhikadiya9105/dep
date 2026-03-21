const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Return = require('../models/Return');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const { protect, authorize, blockSuperuser } = require('../middleware/auth');
const featureCheck = require('../middleware/featureCheck');

router.use(protect, authorize('owner', 'manager'), blockSuperuser, featureCheck('reports'));

// GET /api/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Scope to the user's store — never use query params for storeId (data isolation)
    const storeId = req.user.storeId;
    const saleFilter = storeId ? { storeId } : {};
    const invFilter = storeId ? { storeId } : {};
    const userFilter = { role: { $in: ['manager', 'staff'] }, status: 'approved' };
    if (storeId) userFilter.storeId = storeId;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allSales, allReturns, inventory, staffCount] = await Promise.all([
      Sale.find(saleFilter),
      Return.find(saleFilter),
      Inventory.find(invFilter).populate('productId', 'price'),
      User.countDocuments(userFilter),
    ]);

    const dailySales = allSales.filter((s) => new Date(s.createdAt) >= startOfDay);
    const monthlySales = allSales.filter((s) => new Date(s.createdAt) >= startOfMonth);
    const dailyReturns = allReturns.filter((r) => new Date(r.createdAt) >= startOfDay);
    const monthlyReturns = allReturns.filter((r) => new Date(r.createdAt) >= startOfMonth);

    const grossDailyRevenue = dailySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const dailyReturnAmount = dailyReturns.reduce((sum, r) => sum + r.refundAmount, 0);
    const dailyRevenue = Math.max(0, grossDailyRevenue - dailyReturnAmount);

    const grossMonthlyRevenue = monthlySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthlyReturnAmount = monthlyReturns.reduce((sum, r) => sum + r.refundAmount, 0);
    const monthlyRevenue = Math.max(0, grossMonthlyRevenue - monthlyReturnAmount);

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
    const { startDate, endDate, paymentMethod } = req.query;
    const filter = {};

    // Scope to the user's store — never use query params for storeId (data isolation)
    if (req.user.storeId) filter.storeId = req.user.storeId;

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

    // Fetch all returns for this store to calculate net revenue and annotate sales
    const returnFilter = {};
    if (req.user.storeId) returnFilter.storeId = req.user.storeId;
    const returns = await Return.find(returnFilter);

    // Build a map: saleId → total refunded amount
    const returnMap = {};
    returns.forEach((r) => {
      const sid = String(r.saleId);
      returnMap[sid] = (returnMap[sid] || 0) + r.refundAmount;
    });

    // Annotate each sale with return info
    const annotatedSales = sales.map((s) => {
      const obj = s.toObject();
      const returned = returnMap[String(s._id)] || 0;
      obj.returnedAmount = returned;
      obj.returnStatus = returned > 0
        ? (returned >= s.totalAmount ? 'returned' : 'partial_return')
        : null;
      return obj;
    });

    const grossRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalReturned = returns.reduce((sum, r) => sum + r.refundAmount, 0);
    const totalRevenue = Math.max(0, grossRevenue - totalReturned);
    const totalOrders = sales.length;
    // Estimate profit as 20% of net revenue for demo
    const totalProfit = totalRevenue * 0.2;
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

    res.json({
      sales: annotatedSales,
      summary: { grossRevenue, totalReturned, totalRevenue, totalOrders, totalProfit, profitMargin }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
