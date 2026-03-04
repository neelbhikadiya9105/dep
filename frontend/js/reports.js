/* reports.js */

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
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
  box.innerHTML = `<div class="alert alert-${type}"><i class="fas fa-circle-xmark"></i> ${msg}</div>`;
  setTimeout(() => box.innerHTML = '', 5000);
}

function updateCards(summary) {
  document.getElementById('card-revenue').textContent = fmt(summary.totalRevenue);
  document.getElementById('card-orders').textContent = summary.totalOrders;
  document.getElementById('card-profit').textContent = fmt(summary.totalProfit);
  document.getElementById('card-margin').textContent = summary.profitMargin + '%';
}

function renderTable(sales) {
  const tbody = document.getElementById('sales-table');
  document.getElementById('result-count').textContent = `${sales.length} transaction${sales.length !== 1 ? 's' : ''} found`;

  if (!sales.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-receipt"></i>No sales records found</td></tr>';
    return;
  }

  tbody.innerHTML = sales.map(s => `
    <tr>
      <td style="font-family:monospace;font-size:0.8rem;color:var(--gray)">#${s._id.slice(-8).toUpperCase()}</td>
      <td>${s.customerName || 'Walk-in'}</td>
      <td>
        ${s.items.map(i => `<span style="display:block;font-size:0.8rem">${i.name} ×${i.qty}</span>`).join('')}
      </td>
      <td style="font-weight:700;color:var(--success)">${fmt(s.totalAmount)}</td>
      <td><span class="badge ${s.paymentMethod === 'cash' ? 'badge-success' : 'badge-info'}">${s.paymentMethod}</span></td>
      <td>${s.employeeId ? s.employeeId.name : 'N/A'}</td>
      <td style="color:var(--gray);font-size:0.82rem">${fmtDate(s.createdAt)}</td>
    </tr>
  `).join('');
}

async function loadReports() {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const paymentMethod = document.getElementById('payment-filter').value;

  let query = '/reports/sales?';
  if (startDate) query += `startDate=${startDate}&`;
  if (endDate) query += `endDate=${endDate}&`;
  if (paymentMethod && paymentMethod !== 'all') query += `paymentMethod=${paymentMethod}&`;

  try {
    const data = await API.get(query.replace(/&$/, '').replace(/\?$/, ''));
    updateCards(data.summary);
    renderTable(data.sales);
  } catch (err) {
    showAlert(err.message);
  }
}

function init() {
  if (!API.requireAuth()) return;
  setupUser();
  setupLogout();

  // Set default date range to current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  document.getElementById('start-date').value = firstDay.toISOString().split('T')[0];
  document.getElementById('end-date').value = now.toISOString().split('T')[0];

  document.getElementById('apply-filter-btn').addEventListener('click', loadReports);
  document.getElementById('reset-filter-btn').addEventListener('click', () => {
    document.getElementById('start-date').value = firstDay.toISOString().split('T')[0];
    document.getElementById('end-date').value = now.toISOString().split('T')[0];
    document.getElementById('payment-filter').value = 'all';
    loadReports();
  });

  loadReports();
}

init();
