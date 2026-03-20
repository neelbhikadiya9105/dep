import { useState, useEffect, useCallback } from 'react';
import {
  FiUsers, FiCheckCircle, FiXCircle, FiClock, FiTrash2,
  FiShield, FiBarChart2, FiFileText, FiMessageSquare, FiTag,
  FiRefreshCw, FiPauseCircle, FiPlayCircle, FiAlertTriangle,
  FiSettings, FiDownload, FiSend, FiHome
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../api/axios.js';
import { fmtDate } from '../utils/helpers.js';
import '../css/superuser.css';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  active:     'superuser-status--approved',
  trial:      'superuser-status--pending',
  expired:    'superuser-status--deactivated',
  suspended:  'superuser-status--rejected',
  banned:     'superuser-status--rejected',
  inactive:   'superuser-status--deactivated',
  approved:   'superuser-status--approved',
  pending:    'superuser-status--pending',
  rejected:   'superuser-status--rejected',
  deactivated:'superuser-status--deactivated',
  cancelled:  'superuser-status--deactivated',
};

function StatusBadge({ status }) {
  return <span className={`superuser-status ${STATUS_COLORS[status] || 'superuser-status--deactivated'}`}>{status}</span>;
}

function PlanBadge({ plan }) {
  const colors = { free: 'badge-free', basic: 'badge-basic', pro: 'badge-pro' };
  return <span className={`superuser-plan-badge ${colors[plan] || ''}`}>{plan || 'free'}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function DashboardTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/superuser/dashboard')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (!data) return <div className="superuser-empty">Failed to load dashboard data.</div>;

  const statusBreakdown = data.shopStatusBreakdown || {};

  return (
    <div>
      <div className="superuser-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {[
          { label: 'Total Users', value: data.totalUsers, icon: <FiUsers />, color: 'blue' },
          { label: 'Active Shops', value: data.activeShops, icon: <FiCheckCircle />, color: 'green' },
          { label: 'On Trial', value: data.trialShops, icon: <FiClock />, color: 'yellow' },
          { label: 'Pending Requests', value: data.pendingRequests, icon: <FiAlertTriangle />, color: 'red' },
          { label: 'New This Month', value: data.newShopsThisMonth, icon: <FiHome />, color: 'blue' },
          { label: 'MRR (₹)', value: `₹${(data.mrr || 0).toLocaleString()}`, icon: <FiBarChart2 />, color: 'green' },
        ].map((card) => (
          <div key={card.label} className="superuser-stat-card">
            <div className={`superuser-stat-card__icon superuser-stat-card__icon--${card.color}`}>{card.icon}</div>
            <div>
              <div className="superuser-stat-card__value">{card.value}</div>
              <div className="superuser-stat-card__label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="su-grid-2col">
        <div className="superuser-card">
          <div className="superuser-card__header"><div className="superuser-card__title">Shop Status Breakdown</div></div>
          <div style={{ padding: '16px 20px' }}>
            {Object.entries(statusBreakdown).map(([status, count]) => (
              <div key={status} className="su-status-row">
                <StatusBadge status={status} />
                <span className="su-status-count">{count}</span>
              </div>
            ))}
            {!Object.keys(statusBreakdown).length && <div className="superuser-empty">No shops yet.</div>}
          </div>
        </div>

        <div className="superuser-card">
          <div className="superuser-card__header"><div className="superuser-card__title">Recent Sign-ups</div></div>
          <div style={{ padding: '16px 20px' }}>
            {(data.signupHistory || []).map((item, i) => (
              <div key={i} className="su-status-row">
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  {item._id?.month}/{item._id?.year}
                </span>
                <span className="su-status-count">{item.count}</span>
              </div>
            ))}
            {!(data.signupHistory || []).length && <div className="superuser-empty">No data yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Access Requests + Shop Management
// ─────────────────────────────────────────────────────────────────────────────
function ShopsTab({ showAlert, loadData, requests, owners, shops }) {
  const [subTab, setSubTab] = useState('requests');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopDetail, setShopDetail] = useState(null);
  const [extendDays, setExtendDays] = useState(14);
  const [overridePlan, setOverridePlan] = useState('basic');
  const [featureFlags, setFeatureFlags] = useState(null);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const openShopDetail = async (shopId) => {
    try {
      const res = await apiGet(`/superuser/shops/${shopId}`);
      setShopDetail(res.data);
      setSelectedShop(shopId);
      const ffRes = await apiGet(`/superuser/feature-flags/${shopId}`);
      setFeatureFlags(ffRes.data?.features || null);
    } catch {
      setShopDetail(null);
    }
  };

  const closeDetail = () => { setSelectedShop(null); setShopDetail(null); setFeatureFlags(null); };

  const handleApproveRequest = async (id) => {
    if (!window.confirm('Approve this access request? A new Owner account and Store will be created.')) return;
    try {
      const res = await apiPost(`/superuser/access-requests/${id}/approve`, {});
      const msg = res.tempPassword
        ? `Owner "${res.owner?.name}" created. Temp password: ${res.tempPassword} — share securely.`
        : `Owner "${res.owner?.name}" (${res.owner?.email}) created. They can log in with their chosen password.`;
      showAlert(msg, 'success');
      await loadData();
    } catch (err) { showAlert(err.response?.data?.message || err.message); }
  };

  const handleRejectRequest = async (id) => {
    if (!window.confirm('Reject this access request?')) return;
    try {
      await apiPost(`/superuser/access-requests/${id}/reject`, {});
      showAlert('Request rejected.', 'success');
      await loadData();
    } catch (err) { showAlert(err.response?.data?.message || err.message); }
  };

  const handleShopAction = async (id, action, body = {}) => {
    try {
      if (action === 'delete') {
        if (!window.confirm('Permanently delete this shop and ALL its data? This cannot be undone.')) return;
        await apiDelete(`/superuser/shops/${id}`);
      } else {
        await apiPatch(`/superuser/shops/${id}/${action}`, body);
      }
      showAlert(`Shop ${action} successful.`, 'success');
      await loadData();
      closeDetail();
    } catch (err) { showAlert(err.response?.data?.message || err.message); }
  };

  const handleExtendTrial = async (id) => {
    try {
      const res = await apiPatch(`/superuser/shops/${id}/extend-trial`, { days: parseInt(extendDays) });
      showAlert(res.message, 'success');
      await loadData();
      closeDetail();
    } catch (err) { showAlert(err.response?.data?.message || err.message); }
  };

  const handleOverridePlan = async (id) => {
    try {
      const res = await apiPatch(`/superuser/shops/${id}/override-plan`, { plan: overridePlan });
      showAlert(res.message, 'success');
      await loadData();
      closeDetail();
    } catch (err) { showAlert(err.response?.data?.message || err.message); }
  };

  const handleToggleFeature = async (storeId, feature, value) => {
    try {
      await apiPatch(`/superuser/feature-flags/${storeId}`, { features: { [feature]: value } });
      setFeatureFlags((prev) => ({ ...prev, [feature]: value }));
      showAlert('Feature flag updated.', 'success');
    } catch (err) { showAlert(err.response?.data?.message || err.message); }
  };

  const handleOwnerDeactivate = async (id) => {
    try { await apiPut(`/superuser/owners/${id}/deactivate`, {}); showAlert('Owner deactivated.', 'success'); await loadData(); }
    catch (err) { showAlert(err.response?.data?.message || err.message); }
  };
  const handleOwnerActivate = async (id) => {
    try { await apiPut(`/superuser/owners/${id}/activate`, {}); showAlert('Owner activated.', 'success'); await loadData(); }
    catch (err) { showAlert(err.response?.data?.message || err.message); }
  };
  const handleOwnerDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete owner "${name}"? This cannot be undone.`)) return;
    try { await apiDelete(`/superuser/owners/${id}`); showAlert('Owner deleted.', 'success'); await loadData(); }
    catch (err) { showAlert(err.response?.data?.message || err.message); }
  };

  const filteredShops = shops.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (planFilter && s.plan !== planFilter) return false;
    return true;
  });

  const FEATURES = ['inventory', 'pos', 'returns', 'reports', 'pdfExport', 'employees', 'payments', 'apiAccess', 'darkMode'];

  return (
    <div>
      {/* Sub-tabs */}
      <div className="superuser-tabs" style={{ marginBottom: '16px' }}>
        {[
          ['requests', `Access Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}`],
          ['shops', 'Shop Management'],
          ['owners', 'Owner Accounts'],
        ].map(([key, label]) => (
          <button key={key} className={`superuser-tab ${subTab === key ? 'superuser-tab--active' : ''}`} onClick={() => setSubTab(key)}>{label}</button>
        ))}
      </div>

      {subTab === 'requests' && (
        <div className="superuser-card">
          <div className="superuser-card__header"><div className="superuser-card__title">Access Requests</div></div>
          {!requests.length ? <div className="superuser-empty">No access requests found.</div> : requests.map((r) => (
            <div key={r._id} className="superuser-request-row">
              <div className="superuser-request-row__info">
                <div className="superuser-request-row__name">{r.name}</div>
                <div className="superuser-request-row__email">{r.email}</div>
                {r.businessName && <div className="superuser-request-row__business">🏪 {r.businessName}</div>}
                {r.message && <div className="superuser-request-row__business" style={{ fontStyle: 'italic' }}>"{r.message}"</div>}
                <div className="superuser-request-row__meta">Submitted {fmtDate(r.createdAt)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StatusBadge status={r.status} />
                {r.status === 'pending' && (
                  <div className="superuser-request-row__actions">
                    <button className="superuser-btn superuser-btn--approve" onClick={() => handleApproveRequest(r._id)}><FiCheckCircle size={13} /> Approve</button>
                    <button className="superuser-btn superuser-btn--reject" onClick={() => handleRejectRequest(r._id)}><FiXCircle size={13} /> Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'shops' && (
        <div>
          {/* Filters */}
          <div className="su-filter-row">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="su-filter-select">
              <option value="">All Statuses</option>
              {['active', 'trial', 'expired', 'suspended', 'banned', 'inactive'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="su-filter-select">
              <option value="">All Plans</option>
              {['free', 'basic', 'pro'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="superuser-card">
            <div className="superuser-card__header"><div className="superuser-card__title">Shops ({filteredShops.length})</div></div>
            {!filteredShops.length ? <div className="superuser-empty">No shops found.</div> : filteredShops.map((shop) => (
              <div key={shop._id} className="superuser-shop-row" onClick={() => openShopDetail(shop._id)} style={{ cursor: 'pointer' }}>
                <div className="superuser-owner-row__avatar">{shop.name?.[0]?.toUpperCase() || 'S'}</div>
                <div className="superuser-owner-row__info">
                  <div className="superuser-owner-row__name">{shop.name} <span style={{ fontSize: '11px', color: '#94a3b8' }}>({shop.code})</span></div>
                  <div className="superuser-owner-row__email">{shop.ownerId?.name} · {shop.ownerId?.email}</div>
                  <div className="superuser-owner-row__store">
                    {shop.trialExpiresAt && <span>Trial: {fmtDate(shop.trialExpiresAt)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <StatusBadge status={shop.status} />
                  <PlanBadge plan={shop.plan} />
                </div>
              </div>
            ))}
          </div>

          {/* Shop Detail Drawer */}
          {selectedShop && shopDetail && (
            <div className="su-detail-overlay" onClick={closeDetail}>
              <div className="su-detail-panel" onClick={(e) => e.stopPropagation()}>
                <div className="su-detail-header">
                  <div>
                    <div className="su-detail-title">{shopDetail.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{shopDetail.code}</div>
                  </div>
                  <button className="superuser-btn" onClick={closeDetail}>✕</button>
                </div>

                <div className="su-detail-body">
                  <div className="su-detail-grid">
                    <div className="su-detail-field"><span>Owner</span><strong>{shopDetail.ownerId?.name}</strong></div>
                    <div className="su-detail-field"><span>Email</span><strong>{shopDetail.ownerId?.email}</strong></div>
                    <div className="su-detail-field"><span>Status</span><StatusBadge status={shopDetail.status} /></div>
                    <div className="su-detail-field"><span>Plan</span><PlanBadge plan={shopDetail.plan} /></div>
                    <div className="su-detail-field"><span>Trial Expiry</span><strong>{shopDetail.trialExpiresAt ? fmtDate(shopDetail.trialExpiresAt) : '—'}</strong></div>
                    <div className="su-detail-field"><span>Last Login</span><strong>{shopDetail.ownerId?.lastLogin ? fmtDate(shopDetail.ownerId.lastLogin) : 'Never'}</strong></div>
                    <div className="su-detail-field"><span>Total Orders</span><strong>{shopDetail.totalOrders}</strong></div>
                    <div className="su-detail-field"><span>Total Products</span><strong>{shopDetail.totalProducts}</strong></div>
                  </div>

                  <div className="su-detail-section">Actions</div>
                  <div className="su-action-row">
                    <button className="superuser-btn superuser-btn--approve" onClick={() => handleShopAction(selectedShop, 'approve')}><FiCheckCircle size={13} /> Approve</button>
                    <button className="superuser-btn superuser-btn--reject" onClick={() => handleShopAction(selectedShop, 'reject')}><FiXCircle size={13} /> Reject</button>
                    {shopDetail.status !== 'suspended'
                      ? <button className="superuser-btn superuser-btn--deactivate" onClick={() => handleShopAction(selectedShop, 'suspend')}><FiPauseCircle size={13} /> Suspend</button>
                      : <button className="superuser-btn superuser-btn--activate" onClick={() => handleShopAction(selectedShop, 'unsuspend')}><FiPlayCircle size={13} /> Unsuspend</button>
                    }
                    <button className="superuser-btn superuser-btn--delete" onClick={() => handleShopAction(selectedShop, 'delete')}><FiTrash2 size={13} /> Delete</button>
                  </div>

                  <div className="su-detail-section">Extend Trial</div>
                  <div className="su-inline-action">
                    <input type="number" min="1" max="365" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} className="su-input" style={{ width: '80px' }} />
                    <span style={{ fontSize: '13px', color: '#64748b' }}>days</span>
                    <button className="superuser-btn superuser-btn--activate" onClick={() => handleExtendTrial(selectedShop)}><FiRefreshCw size={13} /> Extend</button>
                  </div>

                  <div className="su-detail-section">Override Plan</div>
                  <div className="su-inline-action">
                    <select value={overridePlan} onChange={(e) => setOverridePlan(e.target.value)} className="su-filter-select">
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                    </select>
                    <button className="superuser-btn superuser-btn--approve" onClick={() => handleOverridePlan(selectedShop)}><FiSettings size={13} /> Apply</button>
                  </div>

                  {featureFlags && (
                    <>
                      <div className="su-detail-section">Feature Flags</div>
                      <div className="su-feature-grid">
                        {FEATURES.map((feat) => (
                          <label key={feat} className="su-feature-toggle">
                            <input
                              type="checkbox"
                              checked={!!featureFlags[feat]}
                              onChange={(e) => handleToggleFeature(selectedShop, feat, e.target.checked)}
                            />
                            <span>{feat}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'owners' && (
        <div className="superuser-card">
          <div className="superuser-card__header"><div className="superuser-card__title">Owner Accounts</div></div>
          {!owners.length ? <div className="superuser-empty">No owner accounts found.</div> : owners.map((o) => (
            <div key={o._id} className="superuser-owner-row">
              <div className="superuser-owner-row__avatar">{o.avatar || o.name?.[0]?.toUpperCase() || 'O'}</div>
              <div className="superuser-owner-row__info">
                <div className="superuser-owner-row__name">{o.displayName || o.name}</div>
                <div className="superuser-owner-row__email">{o.email}</div>
                {o.storeId && <div className="superuser-owner-row__store">🏪 {o.storeId.name} ({o.storeId.code})</div>}
              </div>
              <StatusBadge status={o.status} />
              <div style={{ display: 'flex', gap: '8px' }}>
                {o.status === 'approved'
                  ? <button className="superuser-btn superuser-btn--deactivate" onClick={() => handleOwnerDeactivate(o._id)}>Deactivate</button>
                  : <button className="superuser-btn superuser-btn--activate" onClick={() => handleOwnerActivate(o._id)}>Activate</button>
                }
                <button className="superuser-btn superuser-btn--delete" onClick={() => handleOwnerDelete(o._id, o.name)}><FiTrash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Billing / Coupons
// ─────────────────────────────────────────────────────────────────────────────
function BillingTab({ showAlert }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', discount: '', discountType: 'percent', expiresAt: '', usageLimit: 0 });

  const loadCoupons = useCallback(async () => {
    try {
      const res = await apiGet('/superuser/coupons');
      setCoupons(res.data || []);
    } catch { setCoupons([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/superuser/coupons', form);
      showAlert('Coupon created.', 'success');
      setForm({ code: '', discount: '', discountType: 'percent', expiresAt: '', usageLimit: 0 });
      loadCoupons();
    } catch (err) { showAlert(err.response?.data?.message || err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try { await apiDelete(`/superuser/coupons/${id}`); showAlert('Coupon deleted.', 'success'); loadCoupons(); }
    catch (err) { showAlert(err.response?.data?.message || err.message); }
  };

  return (
    <div>
      <div className="su-grid-2col">
        <div className="superuser-card">
          <div className="superuser-card__header"><div className="superuser-card__title">Create Coupon</div></div>
          <form onSubmit={handleCreate} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input className="su-input" placeholder="Code (e.g. LAUNCH20)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="su-input" type="number" placeholder="Discount" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} required style={{ flex: 1 }} />
              <select className="su-filter-select" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                <option value="percent">%</option>
                <option value="fixed">₹ Fixed</option>
              </select>
            </div>
            <input className="su-input" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} placeholder="Expiry date (optional)" />
            <input className="su-input" type="number" min="0" placeholder="Usage limit (0 = unlimited)" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: parseInt(e.target.value) })} />
            <button type="submit" className="superuser-btn superuser-btn--approve" style={{ alignSelf: 'flex-start' }}><FiTag size={13} /> Create Coupon</button>
          </form>
        </div>

        <div className="superuser-card">
          <div className="superuser-card__header"><div className="superuser-card__title">Active Coupons ({coupons.length})</div></div>
          {loading ? <LoadingSpinner text="Loading..." /> : !coupons.length ? (
            <div className="superuser-empty">No coupons yet.</div>
          ) : coupons.map((c) => (
            <div key={c._id} className="superuser-request-row">
              <div className="superuser-request-row__info">
                <div className="superuser-request-row__name">{c.code}</div>
                <div className="superuser-request-row__email">
                  {c.discountType === 'percent' ? `${c.discount}% off` : `₹${c.discount} off`}
                  {c.expiresAt ? ` · Expires ${fmtDate(c.expiresAt)}` : ' · No expiry'}
                  {c.usageLimit > 0 ? ` · ${c.usedCount}/${c.usageLimit} used` : ' · Unlimited'}
                </div>
              </div>
              <button className="superuser-btn superuser-btn--delete" onClick={() => handleDelete(c._id)}><FiTrash2 size={13} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Logs
// ─────────────────────────────────────────────────────────────────────────────
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', actorRole: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const res = await apiGet('/superuser/logs', params);
      setLogs(res.data || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch { setLogs([]); } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const exportCSV = () => {
    const header = 'Timestamp,Actor,Role,Store,Action,Metadata';
    const rows = logs.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.actorId?.name || 'System',
      l.actorRole,
      l.storeId?.name || '',
      l.action,
      JSON.stringify(l.metadata || {}).replace(/,/g, ';'),
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'activity-logs.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="superuser-card">
      <div className="superuser-card__header">
        <div className="superuser-card__title">Activity Logs ({total})</div>
        <button className="superuser-btn superuser-btn--activate" onClick={exportCSV}><FiDownload size={13} /> Export CSV</button>
      </div>
      <div className="su-filter-row" style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <input className="su-input" placeholder="Filter by action..." value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} style={{ flex: 1 }} />
        <select className="su-filter-select" value={filters.actorRole} onChange={(e) => setFilters({ ...filters, actorRole: e.target.value })}>
          <option value="">All Roles</option>
          {['superuser', 'owner', 'manager', 'staff', 'system'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input type="date" className="su-input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} style={{ width: '140px' }} />
        <input type="date" className="su-input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} style={{ width: '140px' }} />
        <button className="superuser-btn superuser-btn--activate" onClick={() => { setPage(1); loadLogs(); }}><FiRefreshCw size={13} /></button>
      </div>

      {loading ? <LoadingSpinner text="Loading logs..." /> : !logs.length ? (
        <div className="superuser-empty">No logs match your filters.</div>
      ) : (
        <>
          <table className="su-log-table">
            <thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Store</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '11px', color: '#94a3b8' }}>{new Date(l.timestamp).toLocaleString()}</td>
                  <td>{l.actorId?.name || <span style={{ color: '#94a3b8' }}>System</span>}</td>
                  <td><StatusBadge status={l.actorRole} /></td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>{l.storeId?.name || '—'}</td>
                  <td><code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{l.action}</code></td>
                  <td style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {JSON.stringify(l.metadata || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="su-pagination">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="superuser-btn superuser-btn--activate">← Prev</button>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="superuser-btn superuser-btn--activate">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Communications
// ─────────────────────────────────────────────────────────────────────────────
function CommunicationsTab({ owners, showAlert }) {
  const [mode, setMode] = useState('broadcast'); // 'broadcast' | 'targeted'
  const [toId, setToId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState([]);
  const [loadingSent, setLoadingSent] = useState(true);

  useEffect(() => {
    apiGet('/superuser/messages/sent')
      .then((res) => setSent(res.data || []))
      .catch(() => setSent([]))
      .finally(() => setLoadingSent(false));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject || !body) return;
    setSending(true);
    try {
      let res;
      if (mode === 'broadcast') {
        res = await apiPost('/superuser/messages/broadcast', { subject, body });
      } else {
        if (!toId) { showAlert('Select a recipient.'); return; }
        res = await apiPost('/superuser/messages/send', { toId, subject, body });
      }
      showAlert(res.message, 'success');
      setSubject(''); setBody(''); setToId('');
      const sentRes = await apiGet('/superuser/messages/sent');
      setSent(sentRes.data || []);
    } catch (err) { showAlert(err.response?.data?.message || err.message); }
    finally { setSending(false); }
  };

  return (
    <div className="su-grid-2col">
      <div className="superuser-card">
        <div className="superuser-card__header"><div className="superuser-card__title">Compose Message</div></div>
        <form onSubmit={handleSend} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="superuser-tabs" style={{ marginBottom: 0 }}>
            <button type="button" className={`superuser-tab ${mode === 'broadcast' ? 'superuser-tab--active' : ''}`} onClick={() => setMode('broadcast')}>All Owners</button>
            <button type="button" className={`superuser-tab ${mode === 'targeted' ? 'superuser-tab--active' : ''}`} onClick={() => setMode('targeted')}>Specific Owner</button>
          </div>
          {mode === 'targeted' && (
            <select className="su-filter-select" value={toId} onChange={(e) => setToId(e.target.value)} required style={{ width: '100%' }}>
              <option value="">Select recipient...</option>
              {owners.map((o) => <option key={o._id} value={o._id}>{o.name} ({o.email})</option>)}
            </select>
          )}
          <input className="su-input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          <textarea className="su-input" rows={6} placeholder="Message body..." value={body} onChange={(e) => setBody(e.target.value)} required style={{ resize: 'vertical' }} />
          <button type="submit" disabled={sending} className="superuser-btn superuser-btn--approve" style={{ alignSelf: 'flex-start' }}>
            <FiSend size={13} /> {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>

      <div className="superuser-card">
        <div className="superuser-card__header"><div className="superuser-card__title">Sent History</div></div>
        {loadingSent ? <LoadingSpinner text="Loading..." /> : !sent.length ? (
          <div className="superuser-empty">No messages sent yet.</div>
        ) : sent.map((m) => (
          <div key={m._id} className="superuser-request-row">
            <div className="superuser-request-row__info">
              <div className="superuser-request-row__name">{m.subject}</div>
              <div className="superuser-request-row__email">
                {m.isBroadcast ? '�� Broadcast to all owners' : `→ ${m.toId?.name} (${m.toId?.email})`}
              </div>
              <div className="superuser-request-row__meta">{fmtDate(m.sentAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Tab: Support Inbox
// ─────────────────────────────────────────────────────────────────────────────
function InboxTab({ showAlert }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyOpen, setReplyOpen] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    apiGet('/superuser/support-inbox')
      .then((res) => setMessages(res.data || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = (id) => {
    apiPatch(`/messages/${id}/read`).catch(() => {});
    setMessages((prev) => prev.map((m) => m._id === id ? { ...m, read: true } : m));
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await apiPost('/messages', {
        toId: replyOpen.fromId?._id || replyOpen.fromId,
        subject: `Re: ${replyOpen.subject}`,
        body: replyBody,
        parentMessageId: replyOpen._id,
      });
      showAlert('Reply sent.', 'success');
      setReplyOpen(null);
      setReplyBody('');
      load();
    } catch (err) { showAlert(err.response?.data?.message || err.message); }
    finally { setSending(false); }
  };

  if (loading) return <LoadingSpinner text="Loading inbox..." />;
  if (!messages.length) return <div className="superuser-empty">No support messages yet.</div>;

  return (
    <div className="superuser-card">
      <div className="superuser-card__header"><div className="superuser-card__title">Support Inbox</div></div>
      <div style={{ padding: '0 0 8px' }}>
        {messages.map((msg) => (
          <div
            key={msg._id}
            className="superuser-request-row"
            style={{ cursor: 'pointer', borderLeft: !msg.read ? '3px solid #4F8ECC' : '3px solid transparent', paddingLeft: 12 }}
            onClick={() => markRead(msg._id)}
          >
            <div className="superuser-request-row__info" style={{ flex: 1 }}>
              <div className="superuser-request-row__name" style={{ fontWeight: !msg.read ? 700 : 500 }}>
                {!msg.read && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4F8ECC', marginRight: 6, verticalAlign: 'middle' }} />}
                {msg.subject}
              </div>
              <div className="superuser-request-row__email">
                From: {msg.fromId?.name || '—'} · {msg.storeId?.name || msg.storeId || '—'} · {fmtDate(msg.sentAt)}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{msg.body}</div>
            </div>
            <button
              className="superuser-btn superuser-btn--approve"
              style={{ alignSelf: 'flex-start', marginLeft: 12 }}
              onClick={(e) => { e.stopPropagation(); setReplyOpen(msg); setReplyBody(''); }}
            >
              <FiSend size={12} /> Reply
            </button>
          </div>
        ))}
      </div>
      {replyOpen && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Replying to: {replyOpen.subject}</div>
          <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              className="su-input"
              rows={4}
              placeholder="Your reply..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={sending} className="superuser-btn superuser-btn--approve">
                <FiSend size={12} /> {sending ? 'Sending...' : 'Send Reply'}
              </button>
              <button type="button" className="superuser-btn" onClick={() => setReplyOpen(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function SuperuserPanel() {
  const [tab, setTab] = useState('dashboard');
  const [requests, setRequests] = useState([]);
  const [owners, setOwners] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqData, ownerData, shopData] = await Promise.all([
        apiGet('/superuser/access-requests'),
        apiGet('/superuser/owners'),
        apiGet('/superuser/shops'),
      ]);
      setRequests(reqData.data || []);
      setOwners(ownerData.data || []);
      setShops(shopData.data || []);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const activeOwners = owners.filter((o) => o.status === 'approved').length;
  const activeShops = shops.filter((s) => s.status === 'active').length;
  const trialShops = shops.filter((s) => s.status === 'trial').length;

  const TABS = [
    { key: 'dashboard', label: '📊 Dashboard', icon: <FiBarChart2 /> },
    { key: 'shops', label: `🏪 Shops${pendingCount > 0 ? ` (${pendingCount})` : ''}`, icon: <FiShield /> },
    { key: 'billing', label: '💳 Billing', icon: <FiTag /> },
    { key: 'logs', label: '📋 Logs', icon: <FiFileText /> },
    { key: 'comms', label: '💬 Communications', icon: <FiMessageSquare /> },
    { key: 'inbox', label: '📩 Support Inbox', icon: <FiMessageSquare /> },
  ];

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      <div className="superuser-page">
        {/* Top Stats */}
        <div className="superuser-stats">
          {[
            { label: 'Pending Requests', value: pendingCount, color: 'yellow', icon: <FiClock size={18} /> },
            { label: 'Active Owners', value: activeOwners, color: 'green', icon: <FiCheckCircle size={18} /> },
            { label: 'Active Shops', value: activeShops, color: 'blue', icon: <FiUsers size={18} /> },
            { label: 'On Trial', value: trialShops, color: 'yellow', icon: <FiClock size={18} /> },
          ].map((c) => (
            <div key={c.label} className="superuser-stat-card">
              <div className={`superuser-stat-card__icon superuser-stat-card__icon--${c.color}`}>{c.icon}</div>
              <div>
                <div className="superuser-stat-card__value">{c.value}</div>
                <div className="superuser-stat-card__label">{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Tabs */}
        <div className="superuser-tabs">
          {TABS.map(({ key, label }) => (
            <button key={key} className={`superuser-tab ${tab === key ? 'superuser-tab--active' : ''}`} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        {loading && tab !== 'billing' && tab !== 'logs' && tab !== 'comms' && tab !== 'inbox' ? (
          <LoadingSpinner text="Loading panel data..." />
        ) : (
          <>
            {tab === 'dashboard' && <DashboardTab />}
            {tab === 'shops' && <ShopsTab showAlert={showAlert} loadData={loadData} requests={requests} owners={owners} shops={shops} />}
            {tab === 'billing' && <BillingTab showAlert={showAlert} />}
            {tab === 'logs' && <LogsTab />}
            {tab === 'comms' && <CommunicationsTab owners={owners} showAlert={showAlert} />}
            {tab === 'inbox' && <InboxTab showAlert={showAlert} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
