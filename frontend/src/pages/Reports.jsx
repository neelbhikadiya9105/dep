import { useState, useEffect, useCallback } from 'react';
import { FiFilter, FiRotateCcw, FiDollarSign, FiShoppingBag, FiTrendingUp, FiPercent } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import Card from '../components/ui/Card.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import { fmt, fmtDate } from '../utils/helpers.js';

export default function Reports() {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(
    () => localStorage.getItem('selectedStoreId') || ''
  );
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, totalProfit: 0, profitMargin: 0 });
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  useEffect(() => {
    if (isOwner) {
      apiGet('/stores').then(setStores).catch(() => {});
    }
  }, [isOwner]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (paymentFilter && paymentFilter !== 'all') params.paymentMethod = paymentFilter;
    const storeId = isOwner ? selectedStoreId : (user?.storeId || '');
    if (storeId) params.storeId = storeId;
    try {
      const data = await apiGet('/reports/sales', params);
      setSales(data.sales || []);
      setSummary(data.summary || { totalRevenue: 0, totalOrders: 0, totalProfit: 0, profitMargin: 0 });
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, paymentFilter, selectedStoreId, isOwner, user]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleReset = () => {
    setStartDate(firstDay);
    setEndDate(today);
    setPaymentFilter('all');
    setSelectedStoreId('');
    localStorage.setItem('selectedStoreId', '');
    loadReports();
  };

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-col sm:flex-row gap-3 items-end">
        {isOwner && (
          <div className="flex-1">
            <label className="form-label">Store</label>
            <select
              className="form-control"
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value);
                localStorage.setItem('selectedStoreId', e.target.value);
              }}
            >
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1">
          <label className="form-label">Start Date</label>
          <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="form-label">End Date</label>
          <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="form-label">Payment Method</label>
          <select className="form-control" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={loadReports} className="btn btn-primary">
            <FiFilter size={14} /> Apply
          </button>
          <button onClick={handleReset} className="btn btn-outline">
            <FiRotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Card
          title="Revenue"
          value={fmt(summary.totalRevenue)}
          icon={<FiDollarSign size={18} />}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
        />
        <Card
          title="Orders"
          value={summary.totalOrders}
          icon={<FiShoppingBag size={18} />}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <Card
          title="Profit"
          value={fmt(summary.totalProfit)}
          icon={<FiTrendingUp size={18} />}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <Card
          title="Profit Margin"
          value={`${summary.profitMargin}%`}
          icon={<FiPercent size={18} />}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
      </div>

      {/* Sales Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Sales Transactions</h2>
          <span className="text-xs text-slate-400">{sales.length} transaction{sales.length !== 1 ? 's' : ''} found</span>
        </div>
        {loading ? (
          <LoadingSpinner text="Loading reports..." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Employee</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">No sales records found</td>
                  </tr>
                ) : (
                  sales.map((s) => (
                    <tr key={s._id}>
                      <td className="font-mono text-xs text-slate-400">#{s._id.slice(-8).toUpperCase()}</td>
                      <td>{s.customerName || 'Walk-in'}</td>
                      <td>
                        {s.items?.map((i, idx) => (
                          <span key={idx} className="block text-xs">{i.name} ×{i.qty}</span>
                        ))}
                      </td>
                      <td className="font-bold text-emerald-600">{fmt(s.totalAmount)}</td>
                      <td>
                        <span className={`badge ${s.paymentMethod === 'cash' ? 'badge-success' : 'badge-info'}`}>
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td>{s.employeeId?.name || 'N/A'}</td>
                      <td className="text-slate-400 text-xs">{fmtDate(s.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
