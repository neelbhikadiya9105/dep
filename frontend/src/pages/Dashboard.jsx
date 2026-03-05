import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiDollarSign, FiShoppingBag, FiPackage, FiAlertTriangle, FiUsers,
} from 'react-icons/fi';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Card from '../components/ui/Card.jsx';
import { apiGet } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import { fmt, fmtShortDate, getLast7Days, getDayKey } from '../utils/helpers.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [selectedStoreId, setSelectedStoreId] = useState(
    () => localStorage.getItem('selectedStoreId') || ''
  );
  const [loading, setLoading] = useState(true);

  const getStoreId = useCallback(() => {
    if (!user) return '';
    if (user.role !== 'owner') return user.storeId || '';
    return selectedStoreId;
  }, [user, selectedStoreId]);

  useEffect(() => {
    if (user?.role === 'owner') {
      apiGet('/stores').then(setStores).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const storeId = getStoreId();
    const q = storeId ? `?storeId=${storeId}` : '';
    Promise.all([
      apiGet(`/reports/sales${q}`),
      apiGet(`/products${q}`),
      apiGet(`/reports/dashboard${q}`),
    ]).then(([reportData, prods, stats]) => {
      setSales(reportData.sales || []);
      setProducts(prods);
      setDashStats(stats);
    }).catch(console.error).finally(() => setLoading(false));
  }, [getStoreId]);

  const handleStoreChange = (e) => {
    const v = e.target.value;
    setSelectedStoreId(v);
    localStorage.setItem('selectedStoreId', v);
  };

  // KPIs
  const today = new Date().toDateString();
  const todaySales = sales.filter((s) => new Date(s.createdAt).toDateString() === today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const lowCount = products.filter((p) => p.quantity <= p.threshold).length;

  // Chart
  const days = getLast7Days();
  const labels = days.map(getDayKey);
  const revenueMap = Object.fromEntries(labels.map((l) => [l, 0]));
  sales.forEach((s) => {
    const key = getDayKey(s.createdAt);
    if (revenueMap[key] !== undefined) revenueMap[key] += s.totalAmount;
  });

  const chartData = {
    labels,
    datasets: [{
      label: 'Revenue ($)',
      data: labels.map((l) => revenueMap[l]),
      fill: true,
      backgroundColor: 'rgba(79,70,229,0.08)',
      borderColor: '#4f46e5',
      borderWidth: 2.5,
      pointBackgroundColor: '#4f46e5',
      pointRadius: 4,
      tension: 0.4,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ' $' + c.parsed.y.toFixed(2) } },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v) => '$' + v } },
      x: { grid: { display: false } },
    },
  };

  // Top products
  const productMap = {};
  sales.forEach((s) => {
    s.items?.forEach((item) => {
      if (!productMap[item.name]) productMap[item.name] = { qty: 0, revenue: 0 };
      productMap[item.name].qty += item.qty;
      productMap[item.name].revenue += item.price * item.qty;
    });
  });
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const lowStockProducts = products.filter((p) => p.quantity <= p.threshold).slice(0, 8);
  const recentSales = sales.slice(0, 10);

  return (
    <DashboardLayout>
      {/* Store selector */}
      {user?.role === 'owner' && (
        <div className="mb-5 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Store:</label>
          <select
            value={selectedStoreId}
            onChange={handleStoreChange}
            className="form-control w-48"
          >
            <option value="">All Stores</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card
          title="Today's Revenue"
          value={fmt(todayRevenue)}
          icon={<FiDollarSign size={18} />}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
        <Card
          title="Today's Orders"
          value={todaySales.length}
          icon={<FiShoppingBag size={18} />}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <Card
          title="Total Products"
          value={products.length}
          icon={<FiPackage size={18} />}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        {getStoreId() ? (
          <Card
            title="Store Staff"
            value={dashStats?.staffCount ?? '—'}
            icon={<FiUsers size={18} />}
            colorClass="text-violet-600"
            bgClass="bg-violet-50"
          />
        ) : (
          <Card
            title="Low Stock Alerts"
            value={lowCount}
            icon={<FiAlertTriangle size={18} />}
            colorClass="text-amber-600"
            bgClass="bg-amber-50"
          />
        )}
      </div>

      {/* Chart + Top Products */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue — Last 7 Days</h3>
          <Line data={chartData} options={chartOptions} />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Products</h3>
          {topProducts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No sales data</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 text-left">#</th>
                  <th className="pb-2 text-left">Product</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map(([name, d], i) => (
                  <tr key={name} className="border-b border-slate-50">
                    <td className="py-2 text-slate-400 text-xs">{i + 1}</td>
                    <td className="py-2 font-medium text-slate-700">{name}</td>
                    <td className="py-2 text-right text-slate-500">{d.qty}</td>
                    <td className="py-2 text-right font-semibold text-emerald-600">{fmt(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Low Stock + Recent Sales */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Low Stock Items</h3>
          {lowStockProducts.length === 0 ? (
            <p className="text-emerald-600 text-sm text-center py-6">✓ All stocked up!</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 text-left">Product</th>
                  <th className="pb-2 text-left">Category</th>
                  <th className="pb-2 text-right">Stock</th>
                  <th className="pb-2 text-right">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((p) => (
                  <tr key={p._id} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-red-600">{p.name}</td>
                    <td className="py-2">
                      <span className="badge badge-gray">{p.category}</span>
                    </td>
                    <td className="py-2 text-right">
                      <span className={`badge ${p.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {p.quantity} left
                      </span>
                    </td>
                    <td className="py-2 text-right text-slate-500">{p.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Recent Sales</h3>
          {recentSales.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No recent sales</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((s) => (
                <div key={s._id} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div>
                    <div className="text-sm font-medium text-slate-700">
                      {s.customerName || 'Walk-in'}
                    </div>
                    <div className="text-xs text-slate-400">
                      #{s._id.slice(-8).toUpperCase()} · {s.items?.length} item(s) · {fmtShortDate(s.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-600">{fmt(s.totalAmount)}</div>
                    <span className={`badge ${s.paymentMethod === 'cash' ? 'badge-success' : 'badge-info'}`}>
                      {s.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
