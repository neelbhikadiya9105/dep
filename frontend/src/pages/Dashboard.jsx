import { useState, useEffect, useCallback } from 'react';
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
  const [selectedStoreId, setSelectedStoreId] = useState(() => localStorage.getItem('selectedStoreId') || '');
  const [loading, setLoading] = useState(true);

  const getStoreId = useCallback(() => {
    if (!user) return '';
    if (user.role !== 'owner') return user.storeId || '';
    return selectedStoreId;
  }, [user, selectedStoreId]);

  useEffect(() => {
    if (user?.role === 'owner') {
      apiGet('/stores').then((data) => setStores(Array.isArray(data) ? data : (data.data || []))).catch(() => {});
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
      setProducts(Array.isArray(prods) ? prods : (prods.data || []));
      setDashStats(stats);
    }).catch(console.error).finally(() => setLoading(false));
  }, [getStoreId]);

  const handleStoreChange = (e) => {
    const value = e.target.value;
    setSelectedStoreId(value);
    localStorage.setItem('selectedStoreId', value);
  };

  const today = new Date().toDateString();
  const todaySales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === today);
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const lowCount = products.filter((product) => product.quantity <= product.threshold).length;

  const days = getLast7Days();
  const labels = days.map(getDayKey);
  const revenueMap = Object.fromEntries(labels.map((label) => [label, 0]));
  sales.forEach((sale) => {
    const key = getDayKey(sale.createdAt);
    if (revenueMap[key] !== undefined) revenueMap[key] += sale.totalAmount;
  });

  const chartData = {
    labels,
    datasets: [{
      label: 'Revenue ($)',
      data: labels.map((label) => revenueMap[label]),
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
      tooltip: { callbacks: { label: (context) => ` $${context.parsed.y.toFixed(2)}` } },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (value) => `$${value}` } },
      x: { grid: { display: false } },
    },
  };

  const productMap = {};
  sales.forEach((sale) => {
    sale.items?.forEach((item) => {
      if (!productMap[item.name]) productMap[item.name] = { qty: 0, revenue: 0 };
      productMap[item.name].qty += item.qty;
      productMap[item.name].revenue += item.price * item.qty;
    });
  });
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const lowStockProducts = products.filter((product) => product.quantity <= product.threshold).slice(0, 8);
  const recentSales = sales.slice(0, 10);

  return (
    <DashboardLayout>
      {user?.role === 'owner' && (
        <div className="dashboard-store-switcher">
          <label className="dashboard-store-label">Store:</label>
          <select value={selectedStoreId} onChange={handleStoreChange} className="form-control dashboard-store-select">
            <option value="">All Stores</option>
            {stores.map((store) => (
              <option key={store._id} value={store._id}>{store.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="metrics-grid metrics-grid--four">
        <Card title="Today's Revenue" value={fmt(todayRevenue)} icon={<FiDollarSign size={18} />} tone="tone-indigo" />
        <Card title="Today's Orders" value={todaySales.length} icon={<FiShoppingBag size={18} />} tone="tone-emerald" />
        <Card title="Total Products" value={products.length} icon={<FiPackage size={18} />} tone="tone-blue" />
        {getStoreId() ? (
          <Card title="Store Staff" value={dashStats?.staffCount ?? '—'} icon={<FiUsers size={18} />} tone="tone-violet" />
        ) : (
          <Card title="Low Stock Alerts" value={lowCount} icon={<FiAlertTriangle size={18} />} tone="tone-amber" />
        )}
      </div>

      <div className="dashboard-overview-grid">
        <div className="panel panel-body dashboard-chart-panel">
          <h3 className="panel-title dashboard-panel-title">Revenue - Last 7 Days</h3>
          {loading ? <div className="empty-state">Loading chart...</div> : <Line data={chartData} options={chartOptions} />}
        </div>

        <div className="panel panel-body">
          <h3 className="panel-title dashboard-panel-title">Top Products</h3>
          {topProducts.length === 0 ? (
            <p className="empty-state">No sales data</p>
          ) : (
            <table className="dashboard-mini-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th className="table-cell-right">Qty</th>
                  <th className="table-cell-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map(([name, data], index) => (
                  <tr key={name}>
                    <td className="table-note">{index + 1}</td>
                    <td className="table-cell-primary">{name}</td>
                    <td className="table-cell-right text-muted">{data.qty}</td>
                    <td className="table-cell-right text-success dashboard-emphasis">{fmt(data.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="dashboard-secondary-grid">
        <div className="panel panel-body">
          <h3 className="panel-title dashboard-panel-title">Low Stock Items</h3>
          {lowStockProducts.length === 0 ? (
            <p className="empty-state text-success">All stocked up!</p>
          ) : (
            <table className="dashboard-mini-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="table-cell-right">Stock</th>
                  <th className="table-cell-right">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product._id}>
                    <td className="table-cell-primary text-danger">{product.name}</td>
                    <td><span className="badge badge-gray">{product.category}</span></td>
                    <td className="table-cell-right">
                      <span className={`badge ${product.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {product.quantity} left
                      </span>
                    </td>
                    <td className="table-cell-right text-muted">{product.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel panel-body">
          <h3 className="panel-title dashboard-panel-title">Recent Sales</h3>
          {recentSales.length === 0 ? (
            <p className="empty-state">No recent sales</p>
          ) : (
            <div className="dashboard-sales-list">
              {recentSales.map((sale) => (
                <div key={sale._id} className="dashboard-sales-item">
                  <div>
                    <div className="table-cell-primary">{sale.customerName || 'Walk-in'}</div>
                    <div className="table-cell-secondary">
                      #{sale._id.slice(-8).toUpperCase()} · {sale.items?.length} item(s) · {fmtShortDate(sale.createdAt)}
                    </div>
                  </div>
                  <div className="dashboard-sales-meta">
                    <div className="dashboard-emphasis text-success">{fmt(sale.totalAmount)}</div>
                    <span className={`badge ${sale.paymentMethod === 'cash' ? 'badge-success' : 'badge-info'}`}>
                      {sale.paymentMethod}
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
