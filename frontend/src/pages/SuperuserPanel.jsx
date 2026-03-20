import { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiCheckCircle, FiXCircle, FiClock, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/axios.js';
import { fmtDate } from '../utils/helpers.js';
import '../css/superuser.css';

export default function SuperuserPanel() {
  const [tab, setTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqData, ownerData] = await Promise.all([
        apiGet('/superuser/access-requests'),
        apiGet('/superuser/owners'),
      ]);
      setRequests(reqData.data || []);
      setOwners(ownerData.data || []);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this access request? A new Owner account and Store will be created.')) return;
    try {
      const res = await apiPost(`/superuser/access-requests/${id}/approve`, {});
      const msg = `Owner "${res.owner?.name}" (${res.owner?.email}) created successfully. A temporary password has been generated — please share it securely with the new owner.`;
      showAlert(msg, 'success');
      await loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this access request?')) return;
    try {
      await apiPost(`/superuser/access-requests/${id}/reject`, {});
      showAlert('Request rejected.', 'success');
      await loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await apiPut(`/superuser/owners/${id}/deactivate`, {});
      showAlert('Owner deactivated.', 'success');
      await loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  const handleActivate = async (id) => {
    try {
      await apiPut(`/superuser/owners/${id}/activate`, {});
      showAlert('Owner activated.', 'success');
      await loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete owner "${name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/superuser/owners/${id}`);
      showAlert('Owner deleted.', 'success');
      await loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const activeOwners = owners.filter((o) => o.status === 'approved').length;

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      <div className="superuser-page">
        {/* Stats */}
        <div className="superuser-stats">
          <div className="superuser-stat-card">
            <div className="superuser-stat-card__icon superuser-stat-card__icon--yellow">
              <FiClock size={18} />
            </div>
            <div>
              <div className="superuser-stat-card__value">{pendingCount}</div>
              <div className="superuser-stat-card__label">Pending Requests</div>
            </div>
          </div>
          <div className="superuser-stat-card">
            <div className="superuser-stat-card__icon superuser-stat-card__icon--green">
              <FiCheckCircle size={18} />
            </div>
            <div>
              <div className="superuser-stat-card__value">{approvedCount}</div>
              <div className="superuser-stat-card__label">Approved Requests</div>
            </div>
          </div>
          <div className="superuser-stat-card">
            <div className="superuser-stat-card__icon superuser-stat-card__icon--blue">
              <FiUsers size={18} />
            </div>
            <div>
              <div className="superuser-stat-card__value">{activeOwners}</div>
              <div className="superuser-stat-card__label">Active Owners</div>
            </div>
          </div>
          <div className="superuser-stat-card">
            <div className="superuser-stat-card__icon superuser-stat-card__icon--blue">
              <FiUsers size={18} />
            </div>
            <div>
              <div className="superuser-stat-card__value">{owners.length}</div>
              <div className="superuser-stat-card__label">Total Owners</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="superuser-tabs">
          <button
            className={`superuser-tab ${tab === 'requests' ? 'superuser-tab--active' : ''}`}
            onClick={() => setTab('requests')}
          >
            Access Requests {pendingCount > 0 && `(${pendingCount} pending)`}
          </button>
          <button
            className={`superuser-tab ${tab === 'owners' ? 'superuser-tab--active' : ''}`}
            onClick={() => setTab('owners')}
          >
            Owner Management
          </button>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading panel data..." />
        ) : tab === 'requests' ? (
          <div className="superuser-card">
            <div className="superuser-card__header">
              <div className="superuser-card__title">Access Requests</div>
            </div>
            {requests.length === 0 ? (
              <div className="superuser-empty">No access requests found.</div>
            ) : (
              requests.map((r) => (
                <div key={r._id} className="superuser-request-row">
                  <div className="superuser-request-row__info">
                    <div className="superuser-request-row__name">{r.name}</div>
                    <div className="superuser-request-row__email">{r.email}</div>
                    {r.businessName && (
                      <div className="superuser-request-row__business">🏪 {r.businessName}</div>
                    )}
                    {r.message && (
                      <div className="superuser-request-row__business" style={{ fontStyle: 'italic' }}>"{r.message}"</div>
                    )}
                    <div className="superuser-request-row__meta">
                      Submitted {fmtDate(r.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`superuser-status superuser-status--${r.status}`}>{r.status}</span>
                    {r.status === 'pending' && (
                      <div className="superuser-request-row__actions">
                        <button className="superuser-btn superuser-btn--approve" onClick={() => handleApprove(r._id)}>
                          <FiCheckCircle size={13} /> Approve
                        </button>
                        <button className="superuser-btn superuser-btn--reject" onClick={() => handleReject(r._id)}>
                          <FiXCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="superuser-card">
            <div className="superuser-card__header">
              <div className="superuser-card__title">Owner Accounts</div>
            </div>
            {owners.length === 0 ? (
              <div className="superuser-empty">No owner accounts found.</div>
            ) : (
              owners.map((o) => (
                <div key={o._id} className="superuser-owner-row">
                  <div className="superuser-owner-row__avatar">
                    {o.avatar || o.name?.[0]?.toUpperCase() || 'O'}
                  </div>
                  <div className="superuser-owner-row__info">
                    <div className="superuser-owner-row__name">{o.displayName || o.name}</div>
                    <div className="superuser-owner-row__email">{o.email}</div>
                    {o.storeId && (
                      <div className="superuser-owner-row__store">
                        🏪 {o.storeId.name} ({o.storeId.code})
                      </div>
                    )}
                  </div>
                  <span className={`superuser-status superuser-status--${o.status}`}>{o.status}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {o.status === 'approved' ? (
                      <button className="superuser-btn superuser-btn--deactivate" onClick={() => handleDeactivate(o._id)}>
                        Deactivate
                      </button>
                    ) : (
                      <button className="superuser-btn superuser-btn--activate" onClick={() => handleActivate(o._id)}>
                        Activate
                      </button>
                    )}
                    <button className="superuser-btn superuser-btn--delete" onClick={() => handleDelete(o._id, o.name)}>
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
