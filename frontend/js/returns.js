/* returns.js */
import API from './api.js';

let allSales = [];
let selectedSale = null;

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  setTimeout(() => box.innerHTML = '', 6000);
}

function renderReturnsTable(returns) {
  const tbody = document.getElementById('returns-table');
  if (!returns.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-inbox"></i>No returns recorded</td></tr>';
    return;
  }

  tbody.innerHTML = returns.map(r => `
    <tr>
      <td style="font-family:monospace;font-size:0.78rem;color:var(--gray)">#${r._id.slice(-8).toUpperCase()}</td>
      <td style="font-family:monospace;font-size:0.78rem;color:var(--gray)">#${r.saleId ? (r.saleId._id || r.saleId).toString().slice(-8).toUpperCase() : 'N/A'}</td>
      <td style="font-weight:500">${r.productId ? r.productId.name : 'N/A'}</td>
      <td>${r.quantity}</td>
      <td><span class="badge badge-warning">${r.reason}</span></td>
      <td style="font-weight:600;color:var(--danger)">${fmt(r.refundAmount)}</td>
      <td>${r.processedBy ? r.processedBy.name : 'N/A'}</td>
      <td style="color:var(--gray);font-size:0.82rem">${fmtDate(r.createdAt)}</td>
    </tr>
  `).join('');
}

async function lookupSale() {
  const saleId = document.getElementById('sale-id-input').value.trim();
  if (!saleId) return showAlert('Enter a Sale ID to look up.', 'warning');

  try {
    const sales = await API.get('/sales');
    // Find by full ID or last 8 chars
    selectedSale = sales.find(s =>
      s._id === saleId ||
      s._id.slice(-8).toUpperCase() === saleId.toUpperCase()
    );

    if (!selectedSale) return showAlert('Sale not found. Check the ID and try again.');

    // Populate product dropdown
    const select = document.getElementById('return-product');
    select.innerHTML = selectedSale.items.map(item =>
      `<option value="${item.productId}" data-price="${item.price}" data-qty="${item.qty}">
        ${item.name} (${item.qty} × ${fmt(item.price)})
      </option>`
    ).join('');

    // Auto-fill refund amount
    updateRefundAmount();

    // Show sale info
    const saleInfo = document.getElementById('sale-info');
    const saleDetails = document.getElementById('sale-details');
    saleDetails.innerHTML = `
      <strong>Sale #${selectedSale._id.slice(-8).toUpperCase()}</strong> — 
      ${selectedSale.customerName || 'Walk-in'} — 
      ${fmt(selectedSale.totalAmount)} (${selectedSale.paymentMethod})
    `;
    saleInfo.style.display = 'block';

  } catch (err) {
    showAlert(err.message);
  }
}

function updateRefundAmount() {
  const select = document.getElementById('return-product');
  const selected = select.options[select.selectedIndex];
  if (!selected) return;
  const price = parseFloat(selected.getAttribute('data-price') || 0);
  const qty = parseInt(document.getElementById('return-qty').value || 1);
  document.getElementById('refund-amount').value = (price * qty).toFixed(2);
}

async function handleReturnSubmit(e) {
  e.preventDefault();
  if (!selectedSale) return showAlert('Look up a sale first.');

  const submitBtn = document.getElementById('submit-return-btn');
  submitBtn.innerHTML = '<span class="spinner" style="border-top-color:var(--dark)"></span> Processing...';
  submitBtn.disabled = true;

  const productId = document.getElementById('return-product').value;
  const quantity = parseInt(document.getElementById('return-qty').value);
  const reason = document.getElementById('return-reason').value;
  const refundAmount = parseFloat(document.getElementById('refund-amount').value);

  try {
    await API.post('/returns', {
      saleId: selectedSale._id,
      productId,
      quantity,
      reason,
      refundAmount
    });

    showAlert('Return processed successfully. Stock has been restocked.', 'success');

    // Reset form
    document.getElementById('return-form').reset();
    document.getElementById('sale-info').style.display = 'none';
    document.getElementById('return-product').innerHTML = '<option value="">-- Look up sale first --</option>';
    selectedSale = null;

    await loadReturns();
  } catch (err) {
    showAlert(err.message);
  }

  submitBtn.innerHTML = '<i class="fas fa-rotate-left"></i> Process Return';
  submitBtn.disabled = false;
}

async function loadReturns() {
  try {
    const returns = await API.get('/returns');
    renderReturnsTable(returns);
  } catch (err) {
    showAlert(err.message);
  }
}

function init() {
  if (!API.requireAuth()) return;
  setupUser();
  setupLogout();

  document.getElementById('lookup-sale-btn').addEventListener('click', lookupSale);
  document.getElementById('sale-id-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); lookupSale(); }
  });
  document.getElementById('return-product').addEventListener('change', updateRefundAmount);
  document.getElementById('return-qty').addEventListener('input', updateRefundAmount);
  document.getElementById('return-form').addEventListener('submit', handleReturnSubmit);

  loadReturns();
}

init();
