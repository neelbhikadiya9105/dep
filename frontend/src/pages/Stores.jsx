import { useState, useEffect, useCallback } from 'react';
import {
  FiMapPin, FiUser, FiUsers, FiDollarSign, FiTrendingUp,
  FiShoppingBag, FiShoppingCart, FiPackage, FiAlertTriangle, FiRefreshCw,
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import { apiGet } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import { fmt, fmtDate } from '../utils/helpers.js';

export default function Stores() {
  const user = useAuthStore((s) => s.user);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadStores = useCallback(async () => {
    try {
      const data = await apiGet('/stores');
      const list = Array.isArray(data) ? data : [];
      setStores(list);

      // Managers auto-select their assigned store
      if (user?.role === 'manager' && list.length > 0) {
        setSelectedStore(list[0]);
      }
    } catch (err) {
      setAlert({ message: err.response?.data?.message || err.message, type: 'error' });
    } finally {
      setLoadingStores(false);
    }
  }, [user]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const loadStoreDetails = useCallback(async (store) => {
    if (!store) return;
    setLoadingStats(true);
    setStats(null);
    setEmployees([]);
    try {
      const [statsData, empData] = await Promise.all([
        apiGet(`/stores/${store._id}/stats`),
        apiGet('/employees', { storeId: store._id }),
      ]);
      setStats(statsData.data || statsData);
      const empList = empData.data || empData;
      setEmployees(Array.isArray(empList) ? empList : []);
    } catch (err) {
      setAlert({ message: err.response?.data?.message || err.message, type: 'error' });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadStoreDetails(selectedStore);
    }
  }, [selectedStore, loadStoreDetails]);

  const handleSelectStore = (store) => {
    setSelectedStore(store);
  };

  const statCards = stats
    ? [
        { label: 'Daily Sales', value: fmt(stats.dailySales), icon: FiDollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Daily Profit', value: fmt(stats.dailyProfit), icon: FiTrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Monthly Sales', value: fmt(stats.monthlySales), icon: FiDollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Monthly Profit', value: fmt(stats.monthlyProfit), icon: FiTrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Total Sales', value: stats.totalSalesCount, icon: FiShoppingBag, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Monthly Orders', value: stats.monthlySalesCount ?? 0, icon: FiShoppingCart, color: 'text-sky-600', bg: 'bg-sky-50' },
        { label: 'Active Staff', value: stats.totalStaff, icon: FiUsers, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Inventory Value', value: fmt(stats.inventoryValue), icon: FiPackage, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { label: 'Low Stock Alerts', value: stats.lowStockCount, icon: FiAlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Stores &amp; Analytics</h2>
          <p className="text-sm text-slate-500">
            {user?.role === 'manager' ? 'View stats for your assigned store' : 'Select a store to view its analytics'}
          </p>
        </div>
        {selectedStore && (
          <button
            onClick={() => loadStoreDetails(selectedStore)}
            className="btn btn-outline btn-sm"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {alert && (
        <Alert message={alert.message} type={alert.type} onClose={() => setAlert(null)} className="mb-4" />
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Store list */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <FiMapPin size={15} /> Stores
            </h3>
            {loadingStores ? (
              <LoadingSpinner />
            ) : stores.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No stores available</p>
            ) : (
              <div className="space-y-2">
                {stores.map((store) => (
                  <button
                    key={store._id}
                    onClick={() => handleSelectStore(store)}
                    className={`w-full text-left px-3 py-3 rounded-lg border transition-all ${
                      selectedStore?._id === store._id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800 text-sm">{store.name}</span>
                      <span
                        className={`badge text-xs ${
                          store.status === 'inactive' ? 'badge-danger' : 'badge-success'
                        }`}
                      >
                        {store.status || 'active'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{store.code}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                      <FiUser size={11} />
                      {store.managerId ? store.managerId.name : <em>No manager</em>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats panel */}
        <div className="lg:col-span-2">
          {!selectedStore ? (
            <div className="card p-12 text-center">
              <FiMapPin size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Select a store to view its analytics</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-800">{selectedStore.name}</h3>
                {selectedStore.address && (
                  <p className="text-xs text-slate-500">{selectedStore.address}</p>
                )}
              </div>

              {loadingStats ? (
                <div className="card p-12 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : stats ? (
                <>
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                      <div key={label} className="card p-4">
                        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                          <Icon size={16} className={color} />
                        </div>
                        <div className="text-lg font-bold text-slate-800">{value}</div>
                        <div className="text-xs text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Employee list */}
                  <div className="card p-5">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <FiUsers size={14} /> Staff ({employees.length})
                    </h4>
                    {employees.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">No staff assigned to this store</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="table w-full text-sm">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Role</th>
                              <th>Status</th>
                              <th>Last Login</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employees.map((emp) => (
                              <tr key={emp._id}>
                                <td>
                                  <div className="font-medium text-slate-800">{emp.name}</div>
                                  <div className="text-xs text-slate-400">{emp.email}</div>
                                </td>
                                <td>
                                  <span className="badge badge-info capitalize">{emp.role}</span>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      emp.status === 'approved'
                                        ? 'badge-success'
                                        : emp.status === 'suspended'
                                        ? 'badge-danger'
                                        : 'badge-warning'
                                    }`}
                                  >
                                    {emp.status}
                                  </span>
                                </td>
                                <td className="text-slate-500 text-xs">
                                  {emp.lastLogin ? fmtDate(emp.lastLogin) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
