import { useState, useEffect, useCallback } from 'react';
import {
  FiMapPin, FiUser, FiUsers, FiDollarSign, FiTrendingUp,
  FiShoppingBag, FiShoppingCart, FiPackage, FiAlertTriangle, FiRefreshCw,
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Alert from '../components/ui/Alert.jsx';
import Card from '../components/ui/Card.jsx';
import { apiGet } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import { fmt, fmtDate } from '../utils/helpers.js';
import '../styles/stores-page.css';

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
      if (user?.role === 'manager' && list.length > 0) setSelectedStore(list[0]);
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
    if (selectedStore) loadStoreDetails(selectedStore);
  }, [selectedStore, loadStoreDetails]);

  const statCards = stats
    ? [
        { label: 'Daily Sales', value: fmt(stats.dailySales), icon: <FiDollarSign size={16} />, tone: 'tone-indigo' },
        { label: 'Daily Profit', value: fmt(stats.dailyProfit), icon: <FiTrendingUp size={16} />, tone: 'tone-emerald' },
        { label: 'Monthly Sales', value: fmt(stats.monthlySales), icon: <FiDollarSign size={16} />, tone: 'tone-blue' },
        { label: 'Monthly Profit', value: fmt(stats.monthlyProfit), icon: <FiTrendingUp size={16} />, tone: 'tone-emerald' },
        { label: 'Total Sales', value: stats.totalSalesCount, icon: <FiShoppingBag size={16} />, tone: 'tone-indigo' },
        { label: 'Monthly Orders', value: stats.monthlySalesCount ?? 0, icon: <FiShoppingCart size={16} />, tone: 'tone-blue' },
        { label: 'Active Staff', value: stats.totalStaff, icon: <FiUsers size={16} />, tone: 'tone-amber' },
        { label: 'Inventory Value', value: fmt(stats.inventoryValue), icon: <FiPackage size={16} />, tone: 'tone-blue' },
        { label: 'Low Stock Alerts', value: stats.lowStockCount, icon: <FiAlertTriangle size={16} />, tone: 'tone-red' },
      ]
    : [];

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Stores &amp; Analytics</h2>
          <p className="page-subtitle">
            {user?.role === 'manager' ? 'View stats for your assigned store' : 'Select a store to view its analytics'}
          </p>
        </div>
        {selectedStore && (
          <button type="button" onClick={() => loadStoreDetails(selectedStore)} className="btn btn-outline btn-sm">
            <FiRefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}

      <div className="stores-layout">
        <div className="panel panel-body">
          <h3 className="stores-sidebar-title"><FiMapPin size={15} /> Stores</h3>
          {loadingStores ? (
            <LoadingSpinner />
          ) : stores.length === 0 ? (
            <div className="empty-state">
              <FiMapPin size={40} className="empty-state-icon" />
              <p>No stores available</p>
            </div>
          ) : (
            <div className="store-list">
              {stores.map((store) => (
                <button
                  type="button"
                  key={store._id}
                  onClick={() => setSelectedStore(store)}
                  className={`store-list-item${selectedStore?._id === store._id ? ' is-active' : ''}`}
                >
                  <div className="store-list-head">
                    <span className="store-list-name">{store.name}</span>
                    <span className={`badge ${(store.status === 'inactive' ? 'badge-danger' : 'badge-success')}`}>{store.status || 'active'}</span>
                  </div>
                  <div className="store-list-code">{store.code}</div>
                  <div className="store-list-manager">
                    <FiUser size={11} />
                    {store.managerId ? store.managerId.name : <em>No manager</em>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {!selectedStore ? (
            <div className="panel panel-body empty-state">
              <FiMapPin size={40} className="empty-state-icon" />
              <p>Select a store to view its analytics</p>
            </div>
          ) : (
            <>
              <div className="store-detail-header">
                <h3 className="store-detail-name">{selectedStore.name}</h3>
                {selectedStore.address && <p className="store-detail-address">{selectedStore.address}</p>}
              </div>

              {loadingStats ? (
                <div className="panel panel-body"><LoadingSpinner /></div>
              ) : stats ? (
                <>
                  <div className="store-stats-grid">
                    {statCards.map(({ label, value, icon, tone }) => (
                      <Card key={label} title={label} value={value} icon={icon} tone={tone} />
                    ))}
                  </div>

                  <div className="panel panel-body">
                    <h4 className="staff-header"><FiUsers size={14} /> Staff ({employees.length})</h4>
                    {employees.length === 0 ? (
                      <div className="empty-state"><p>No staff assigned to this store</p></div>
                    ) : (
                      <div className="table-wrapper">
                        <table className="table">
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
                                  <div className="staff-name">{emp.name}</div>
                                  <div className="staff-email">{emp.email}</div>
                                </td>
                                <td><span className="badge badge-info">{emp.role}</span></td>
                                <td>
                                  <span className={`badge ${emp.status === 'approved' ? 'badge-success' : emp.status === 'suspended' ? 'badge-danger' : 'badge-warning'}`}>
                                    {emp.status}
                                  </span>
                                </td>
                                <td className="table-note">{emp.lastLogin ? fmtDate(emp.lastLogin) : '-'}</td>
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
