/* approvals.js */
import API from './api.js';

function fmtDate(d) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function roleBadge(role) {
  return `<span class="badge role-${role}">${role}</span>`;
}

function setupUser() {
  const user = API.getUser();
  if (!user) return;
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-avatar').textContent = user.name[0].toUpperCase();
  document.getElementById('user-role-badge').innerHTML = roleBadge(user.role);
}

function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    API.clearAuth();
    window.location.href = '/index.html';
  });
}

function showAlert(msg, type = 'error') {
  const box = document.getElementById('alert-box');
  box.innerHTML = `<div class="alert alert-${type}"><i class="fas fa-${type === 'error' ? 'circle-xmark' : 'circle-check'}"></i> ${msg}</div>`;
  setTimeout(() => box.innerHTML = '', 5000);
}

function actionLabel(action) {
  const labels = {
    delete_product: 'Delete Product',
    role_change: 'Role Change',
    large_refund: 'Large Refund'
  };
  return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function statusBadge(status) {
  const map = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

async function updateStatus(id, status) {
  try {
    await API.put(`/approvals/${id}`, { status });
    showAlert(`Request ${status} successfully.`, 'success');
    await loadApprovals();
  } catch (err) {
    showAlert(err.message);
  }
}

async function loadApprovals() {
  try {
    const approvals = await API.get('/approvals');
    const isOwner = API.checkRole('owner');

    const pending = approvals.filter(a => a.status === 'pending');
    const history = approvals.filter(a => a.status !== 'pending');

    // Summary cards
    document.getElementById('card-pending').textContent = pending.length;
    document.getElementById('card-approved').textContent = approvals.filter(a => a.status === 'approved').length;
    document.getElementById('card-rejected').textContent = approvals.filter(a => a.status === 'rejected').length;

    // Hide actions column for non-owners
    if (!isOwner) {
      document.getElementById('actions-col').style.display = 'none';
    }

    // Pending table
    const pendingTbody = document.getElementById('pending-table');
    if (!pending.length) {
      pendingTbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-check-circle" style="color:var(--success)"></i>No pending approvals</td></tr>';
    } else {
      pendingTbody.innerHTML = pending.map(a => `
        <tr>
          <td>
            <span class="badge badge-info">${actionLabel(a.action)}</span>
          </td>
          <td style="max-width:280px;font-size:0.85rem">${a.description}</td>
          <td>
            <div style="font-weight:500;font-size:0.85rem">${a.requestedBy ? a.requestedBy.name : 'N/A'}</div>
            <div style="font-size:0.75rem;color:var(--gray)">${a.requestedBy ? a.requestedBy.email : ''}</div>
          </td>
          <td style="font-size:0.82rem;color:var(--gray)">${fmtDate(a.createdAt)}</td>
          <td>${statusBadge(a.status)}</td>
          <td>${isOwner ? `
            <button class="btn btn-success btn-sm" onclick="updateStatus('${a._id}','approved')">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn btn-danger btn-sm" style="margin-left:5px" onclick="updateStatus('${a._id}','rejected')">
              <i class="fas fa-xmark"></i> Reject
            </button>
          ` : '<span style="color:var(--gray);font-size:0.8rem">Owner only</span>'}</td>
        </tr>
      `).join('');
    }

    // History table
    const historyTbody = document.getElementById('history-table');
    if (!history.length) {
      historyTbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i>No history</td></tr>';
    } else {
      historyTbody.innerHTML = history.map(a => `
        <tr>
          <td><span class="badge badge-gray">${actionLabel(a.action)}</span></td>
          <td style="max-width:280px;font-size:0.85rem">${a.description}</td>
          <td style="font-size:0.85rem">${a.requestedBy ? a.requestedBy.name : 'N/A'}</td>
          <td style="font-size:0.85rem">${a.approvedBy ? a.approvedBy.name : 'N/A'}</td>
          <td>${statusBadge(a.status)}</td>
          <td style="font-size:0.82rem;color:var(--gray)">${fmtDate(a.updatedAt)}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showAlert(err.message);
  }
}

function init() {
  if (!API.requireAuth()) return;
  setupUser();
  setupLogout();
  loadApprovals();
}

init();

// Expose to window for inline onclick handlers
window.updateStatus = updateStatus;

