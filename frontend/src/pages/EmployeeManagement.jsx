import { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiArrowUp, FiArrowDown, FiSlash, FiTrash2, FiEye } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { RoleBadge } from '../components/ui/Badge.jsx';
import { apiGet, apiPut, apiDelete } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';

const STATUS_BADGE = {
  approved: 'badge-success',
  pending: 'badge-warning',
  rejected: 'badge-danger',
  suspended: 'badge-danger',
  deactivated: 'badge-gray',
};

export default function EmployeeManagement() {
  const { user } = useAuthStore();
  const isOwner = user?.role === 'owner';

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadData = useCallback(async () => {
    try {
      const empData = await apiGet('/employees');
      setEmployees(Array.isArray(empData) ? empData : (empData.data || []));
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (url, method = 'put', body = {}) => {
    try {
      if (method === 'delete') await apiDelete(url);
      else await apiPut(url, body);
      await loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Employee Management</h2>
          <p className="text-sm text-slate-500">
            {isOwner ? 'All employees across stores' : 'Employees in your store'}
          </p>
        </div>
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} className="mb-4" />}

      {loading ? (
        <LoadingSpinner />
      ) : employees.length === 0 ? (
        <div className="card p-12 text-center">
          <FiUsers size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No employees found.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Store</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td className="font-medium text-slate-800">{emp.name}</td>
                  <td className="text-slate-500">{emp.email}</td>
                  <td><RoleBadge role={emp.role} /></td>
                  <td className="text-slate-500">{emp.storeId?.name || '—'}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[emp.status] || 'badge-gray'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Link
                        to={`/employees/${emp._id}`}
                        className="btn btn-outline btn-sm"
                        title="View profile"
                      >
                        <FiEye size={12} />
                      </Link>
                      {emp.role === 'staff' && isOwner && (
                        <button
                          onClick={() => handleAction(`/employees/${emp._id}/promote`)}
                          className="btn btn-success btn-sm"
                          title="Promote to manager"
                        >
                          <FiArrowUp size={12} />
                        </button>
                      )}
                      {emp.role === 'manager' && isOwner && (
                        <button
                          onClick={() => handleAction(`/employees/${emp._id}/demote`)}
                          className="btn btn-warning btn-sm"
                          title="Demote to staff"
                        >
                          <FiArrowDown size={12} />
                        </button>
                      )}
                      {isOwner && (
                        <>
                          {emp.status !== 'suspended' && (
                            <button
                              onClick={() => handleAction(`/employees/${emp._id}/suspend`)}
                              className="btn btn-warning btn-sm"
                              title="Suspend"
                            >
                              <FiSlash size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove employee "${emp.name}"?`))
                                handleAction(`/employees/${emp._id}`, 'delete');
                            }}
                            className="btn btn-danger btn-sm"
                            title="Remove"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </DashboardLayout>
  );
}
