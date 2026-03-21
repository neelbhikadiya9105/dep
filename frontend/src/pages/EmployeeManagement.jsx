import { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiArrowUp, FiArrowDown, FiSlash, FiTrash2, FiEye, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import { RoleBadge } from '../components/ui/Badge.jsx';
import { apiGet, apiPut, apiDelete } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import { fmtDate } from '../utils/helpers.js';

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
  const isManager = user?.role === 'manager';

  const [employees, setEmployees] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [approveRole, setApproveRole] = useState('staff');
  const [approveStoreId, setApproveStoreId] = useState('');
  const [saving, setSaving] = useState(false);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadData = useCallback(async () => {
    try {
      const [empData, storeData] = await Promise.all([
        apiGet('/employees'),
        apiGet('/stores'),
      ]);
      setEmployees(Array.isArray(empData) ? empData : (empData.data || []));
      setStores(Array.isArray(storeData) ? storeData : []);

      if (isOwner || isManager) {
        try {
          const pending = await apiGet('/approvals/pending-users');
          setPendingUsers(Array.isArray(pending) ? pending : (pending.data || []));
        } catch { /* non-critical */ }
      }
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [isOwner, isManager]);

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

  const handleApprove = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut(`/approvals/users/${approveModal._id}/approve`, {
        role: approveRole,
        storeId: approveStoreId || undefined,
      });
      showAlert('User approved successfully.', 'success');
      setApproveModal(null);
      await loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Reject this user request?')) return;
    try {
      await apiPut(`/approvals/users/${userId}/reject`);
      showAlert('User rejected.', 'success');
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
      ) : (
        <>
          {/* ── Pending Approvals Section ── */}
          {(isOwner || isManager) && pendingUsers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <FiClock size={16} className="text-amber-500" />
                <h3 className="text-base font-semibold text-slate-700">
                  Pending Approvals
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                    {pendingUsers.length}
                  </span>
                </h3>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((u) => (
                      <tr key={u._id}>
                        <td className="font-medium text-slate-800">{u.name}</td>
                        <td className="text-slate-500">{u.email}</td>
                        <td className="text-slate-500">{fmtDate(u.createdAt)}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setApproveModal(u); setApproveRole('staff'); setApproveStoreId(''); }}
                              className="btn btn-success btn-sm"
                            >
                              <FiCheck size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(u._id)}
                              className="btn btn-danger btn-sm"
                            >
                              <FiX size={12} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Active Employees ── */}
          {employees.length === 0 ? (
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
                          <Link to={`/employees/${emp._id}`} className="btn btn-outline btn-sm" title="View profile">
                            <FiEye size={12} />
                          </Link>
                          {emp.role === 'staff' && isOwner && (
                            <button onClick={() => handleAction(`/employees/${emp._id}/promote`)} className="btn btn-success btn-sm" title="Promote to manager">
                              <FiArrowUp size={12} />
                            </button>
                          )}
                          {emp.role === 'manager' && isOwner && (
                            <button onClick={() => handleAction(`/employees/${emp._id}/demote`)} className="btn btn-warning btn-sm" title="Demote to staff">
                              <FiArrowDown size={12} />
                            </button>
                          )}
                          {isOwner && (
                            <>
                              {emp.status !== 'suspended' && (
                                <button onClick={() => handleAction(`/employees/${emp._id}/suspend`)} className="btn btn-warning btn-sm" title="Suspend">
                                  <FiSlash size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => { if (window.confirm(`Remove employee "${emp.name}"?`)) handleAction(`/employees/${emp._id}`, 'delete'); }}
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
        </>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <Modal isOpen={true} onClose={() => setApproveModal(null)} title={`Approve ${approveModal.name}`}>
          <form onSubmit={handleApprove} className="flex flex-col gap-4">
            <div>
              <label className="form-label">Assign Role</label>
              <select className="form-control" value={approveRole} onChange={(e) => setApproveRole(e.target.value)}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            {stores.length > 0 && (
              <div>
                <label className="form-label">Assign Store</label>
                <select className="form-control" value={approveStoreId} onChange={(e) => setApproveStoreId(e.target.value)}>
                  <option value="">— Select a store —</option>
                  {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-secondary" onClick={() => setApproveModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Approving...' : 'Approve'}</button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
