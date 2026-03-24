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
import '../styles/employee-management.css';

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
      const [empData, storeData] = await Promise.all([apiGet('/employees'), apiGet('/stores')]);
      setEmployees(Array.isArray(empData) ? empData : (empData.data || []));
      setStores(Array.isArray(storeData) ? storeData : []);

      if (isOwner || isManager) {
        try {
          const pending = await apiGet('/approvals/pending-users');
          setPendingUsers(Array.isArray(pending) ? pending : (pending.data || []));
        } catch {
          setPendingUsers([]);
        }
      }
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [isOwner, isManager]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      await apiPut(`/approvals/users/${approveModal._id}/approve`, { role: approveRole, storeId: approveStoreId || undefined });
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
      <div className="page-header">
        <div>
          <h2 className="page-title">Employee Management</h2>
          <p className="page-subtitle">{isOwner ? 'All employees across stores' : 'Employees in your store'}</p>
        </div>
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {(isOwner || isManager) && pendingUsers.length > 0 && (
            <section className="employee-management-pending">
              <div className="employee-management-pending-head">
                <div className="employee-management-pending-title"><FiClock size={16} /> Pending Approvals</div>
                <span className="employee-management-pending-count">{pendingUsers.length}</span>
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
                    {pendingUsers.map((pendingUser) => (
                      <tr key={pendingUser._id}>
                        <td className="table-cell-primary">{pendingUser.name}</td>
                        <td className="text-muted">{pendingUser.email}</td>
                        <td className="text-muted">{fmtDate(pendingUser.createdAt)}</td>
                        <td>
                          <div className="table-actions">
                            <button onClick={() => { setApproveModal(pendingUser); setApproveRole('staff'); setApproveStoreId(''); }} className="btn btn-success btn-sm">
                              <FiCheck size={12} /> Approve
                            </button>
                            <button onClick={() => handleReject(pendingUser._id)} className="btn btn-danger btn-sm">
                              <FiX size={12} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {employees.length === 0 ? (
            <div className="panel empty-state employee-empty-state">
              <FiUsers size={40} className="empty-state-icon" />
              <p>No employees found.</p>
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
                  {employees.map((employee) => (
                    <tr key={employee._id}>
                      <td className="table-cell-primary">{employee.name}</td>
                      <td className="text-muted">{employee.email}</td>
                      <td><RoleBadge role={employee.role} /></td>
                      <td className="text-muted">{employee.storeId?.name || '—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[employee.status] || 'badge-gray'}`}>{employee.status}</span></td>
                      <td>
                        <div className="employee-actions">
                          <Link to={`/employees/${employee._id}`} className="btn btn-outline btn-sm" title="View profile">
                            <FiEye size={12} />
                          </Link>
                          {employee.role === 'staff' && isOwner && (
                            <button onClick={() => handleAction(`/employees/${employee._id}/promote`)} className="btn btn-success btn-sm" title="Promote to manager">
                              <FiArrowUp size={12} />
                            </button>
                          )}
                          {employee.role === 'manager' && isOwner && (
                            <button onClick={() => handleAction(`/employees/${employee._id}/demote`)} className="btn btn-warning btn-sm" title="Demote to staff">
                              <FiArrowDown size={12} />
                            </button>
                          )}
                          {isOwner && (
                            <>
                              {employee.status !== 'suspended' && (
                                <button onClick={() => handleAction(`/employees/${employee._id}/suspend`)} className="btn btn-warning btn-sm" title="Suspend">
                                  <FiSlash size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (window.confirm(`Remove employee "${employee.name}"?`)) handleAction(`/employees/${employee._id}`, 'delete');
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
        </>
      )}

      {approveModal && (
        <Modal isOpen onClose={() => setApproveModal(null)} title={`Approve ${approveModal.name}`}>
          <form onSubmit={handleApprove} className="stack-lg">
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
                  {stores.map((store) => <option key={store._id} value={store._id}>{store.name}</option>)}
                </select>
              </div>
            )}
            <div className="modal-footer-actions modal-footer-actions--soft">
              <button type="button" className="btn btn-secondary" onClick={() => setApproveModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Approving...' : 'Approve'}</button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
