import { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet } from '../api/axios.js';
import { fmtDate } from '../utils/helpers.js';

const ACTION_LABELS = {
  create_store: 'Created Store',
  update_store: 'Updated Store',
  delete_store: 'Deactivated Store',
  assign_store_manager: 'Assigned Store Manager',
  approve_user: 'Approved User',
  reject_user: 'Rejected User',
  promote_employee: 'Promoted Employee',
  demote_employee: 'Demoted Employee',
  transfer_employee: 'Transferred Employee',
  suspend_employee: 'Suspended Employee',
  remove_employee: 'Removed Employee',
  change_password: 'Changed Password',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('');

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/audit-logs', { page, limit: 25 });
      setLogs(Array.isArray(data) ? data : (data.data || []));
      setTotalPages(data.pages || 1);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filtered = filter
    ? logs.filter((log) =>
      log.action?.includes(filter) ||
      log.actorId?.name?.toLowerCase().includes(filter.toLowerCase()) ||
      log.targetId?.name?.toLowerCase().includes(filter.toLowerCase())
    )
    : logs;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Audit Log</h2>
          <p className="page-subtitle">Track significant system actions</p>
        </div>
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      <div className="audit-toolbar">
        <input className="form-control audit-filter-input" placeholder="Filter by action or user..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="panel empty-state audit-empty-state">
          <FiActivity size={40} className="empty-state-icon" />
          <p>No audit log entries found.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Store</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log._id}>
                    <td className="table-note audit-timestamp">{fmtDate(log.createdAt)}</td>
                    <td>
                      {log.actorId ? (
                        <div className="table-cell-stack">
                          <div className="table-cell-primary table-cell-primary--compact">{log.actorId.name}</div>
                          <div className="table-cell-secondary">{log.actorId.email}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td><span className="badge badge-info">{ACTION_LABELS[log.action] || log.action}</span></td>
                    <td>
                      {log.targetId ? (
                        <div className="table-cell-stack">
                          <div className="table-cell-primary table-cell-primary--compact">{log.targetId.name}</div>
                          <div className="table-cell-secondary">{log.targetId.email}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="table-note">{log.storeId?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination-row">
              <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="btn btn-outline btn-sm">
                <FiChevronLeft size={14} />
              </button>
              <span className="pagination-copy">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="btn btn-outline btn-sm">
                <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
