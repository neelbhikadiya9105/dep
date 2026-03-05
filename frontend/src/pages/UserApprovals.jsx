import { useState, useEffect, useCallback } from 'react';
import { FiUserCheck, FiUserX, FiClock } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import { apiGet, apiPut } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import { fmtDate } from '../utils/helpers.js';

export default function UserApprovals() {
  const { user } = useAuthStore();
  const isManager = user?.role === 'manager';

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
      const [users, storeData] = await Promise.all([
        apiGet('/approvals/pending-users'),
        apiGet('/stores'),
      ]);
      setPendingUsers(Array.isArray(users) ? users : (users.data || []));
      setStores(Array.isArray(storeData) ? storeData : []);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut(`/approvals/users/${approveModal._id}/approve`, {
        role: approveRole,
        storeId: approveStoreId || undefined,
      });
      showAlert(`${approveModal.name} approved successfully`, 'success');
      setApproveModal(null);
      await loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const openApproveModal = (u) => {
    setApproveModal(u);
    setApproveRole('staff');
    setApproveStoreId(isManager ? (user?.storeId || '') : '');
  };

  const handleReject = async (u) => {
    if (!window.confirm(`Reject registration for "${u.name}"?`)) return;
    try {
      await apiPut(`/approvals/users/${u._id}/reject`);
      showAlert(`${u.name}'s registration rejected`, 'success');
      await loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">User Approvals</h2>
        <p className="text-sm text-slate-500">Review and approve pending registration requests</p>
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} className="mb-4" />}

      {loading ? (
        <LoadingSpinner />
      ) : pendingUsers.length === 0 ? (
        <div className="card p-12 text-center">
          <FiClock size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No pending approvals.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((u) => (
                <tr key={u._id}>
                  <td className="font-medium text-slate-800">{u.name}</td>
                  <td className="text-slate-500">{u.email}</td>
                  <td className="text-slate-400 text-xs">{fmtDate(u.createdAt)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openApproveModal(u)}
                        className="btn btn-success btn-sm"
                      >
                        <FiUserCheck size={13} /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(u)}
                        className="btn btn-danger btn-sm"
                      >
                        <FiUserX size={13} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Modal */}
      <Modal isOpen={!!approveModal} onClose={() => setApproveModal(null)} title="Approve User">
        <form onSubmit={handleApprove} className="space-y-4">
          <p className="text-sm text-slate-600">
            Approve <strong>{approveModal?.name}</strong> ({approveModal?.email}) and assign a role and store.
          </p>
          <div>
            <label className="form-label">Role *</label>
            <select
              className="form-control"
              value={approveRole}
              onChange={(e) => setApproveRole(e.target.value)}
              required
              disabled={isManager}
            >
              <option value="staff">Staff</option>
              {!isManager && <option value="manager">Manager</option>}
            </select>
          </div>
          <div>
            <label className="form-label">Assign to Store</label>
            <select
              className="form-control"
              value={approveStoreId}
              onChange={(e) => setApproveStoreId(e.target.value)}
              disabled={isManager}
            >
              <option value="">-- No Store --</option>
              {stores.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setApproveModal(null)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-success">
              {saving ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
