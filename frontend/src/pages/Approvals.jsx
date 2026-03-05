import { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiX, FiClock, FiCheckSquare, FiXSquare } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import Card from '../components/ui/Card.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPut } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import { fmtDate } from '../utils/helpers.js';

function actionLabel(action) {
  const labels = {
    delete_product: 'Delete Product',
    role_change: 'Role Change',
    large_refund: 'Large Refund',
  };
  return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Approvals() {
  const { checkRole } = useAuthStore();
  const isOwner = checkRole('owner');

  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadApprovals = useCallback(async () => {
    try {
      const data = await apiGet('/approvals');
      setApprovals(data);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  const updateStatus = async (id, status) => {
    try {
      await apiPut(`/approvals/${id}`, { status });
      showAlert(`Request ${status} successfully.`, 'success');
      await loadApprovals();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  const pending = approvals.filter((a) => a.status === 'pending');
  const history = approvals.filter((a) => a.status !== 'pending');
  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const rejectedCount = approvals.filter((a) => a.status === 'rejected').length;

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card
          title="Pending"
          value={pending.length}
          icon={<FiClock size={18} />}
          colorClass="text-amber-600"
          bgClass="bg-amber-50"
        />
        <Card
          title="Approved"
          value={approvedCount}
          icon={<FiCheckSquare size={18} />}
          colorClass="text-emerald-600"
          bgClass="bg-emerald-50"
        />
        <Card
          title="Rejected"
          value={rejectedCount}
          icon={<FiXSquare size={18} />}
          colorClass="text-red-600"
          bgClass="bg-red-50"
        />
      </div>

      {/* Pending Approvals */}
      <div className="card overflow-hidden mb-5">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Pending Approvals</h2>
        </div>
        {loading ? (
          <LoadingSpinner text="Loading approvals..." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Status</th>
                  {isOwner && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={isOwner ? 6 : 5} className="text-center py-10 text-emerald-600">
                      ✓ No pending approvals
                    </td>
                  </tr>
                ) : (
                  pending.map((a) => (
                    <tr key={a._id}>
                      <td>
                        <span className="badge badge-info">{actionLabel(a.action)}</span>
                      </td>
                      <td className="max-w-xs text-sm">{a.description}</td>
                      <td>
                        <div className="text-sm font-medium">{a.requestedBy?.name || 'N/A'}</div>
                        <div className="text-xs text-slate-400">{a.requestedBy?.email || ''}</div>
                      </td>
                      <td className="text-slate-400 text-xs">{fmtDate(a.createdAt)}</td>
                      <td>
                        <span className="badge badge-warning">{a.status}</span>
                      </td>
                      {isOwner && (
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatus(a._id, 'approved')}
                              className="btn btn-success btn-sm"
                            >
                              <FiCheck size={12} /> Approve
                            </button>
                            <button
                              onClick={() => updateStatus(a._id, 'rejected')}
                              className="btn btn-danger btn-sm"
                            >
                              <FiX size={12} /> Reject
                            </button>
                          </div>
                        </td>
                      )}
                      {!isOwner && <td className="text-slate-400 text-xs">Owner only</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Approval History</h2>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Description</th>
                <th>Requested By</th>
                <th>Approved/Rejected By</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">No history</td>
                </tr>
              ) : (
                history.map((a) => (
                  <tr key={a._id}>
                    <td><span className="badge badge-gray">{actionLabel(a.action)}</span></td>
                    <td className="max-w-xs text-sm">{a.description}</td>
                    <td className="text-sm">{a.requestedBy?.name || 'N/A'}</td>
                    <td className="text-sm">{a.approvedBy?.name || 'N/A'}</td>
                    <td>
                      <span className={`badge ${a.status === 'approved' ? 'badge-success' : 'badge-danger'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs">{fmtDate(a.updatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
