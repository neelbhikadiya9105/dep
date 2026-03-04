/* dashboard.js */

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function getDayKey(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

let chartInstance = null;

function renderChart(sales) {
  const days = getLast7Days();
  const labels = days.map(d => getDayKey(d));
  const revenueMap = {};
  labels.forEach(l => (revenueMap[l] = 0));

  sales.forEach(sale => {
    const key = getDayKey(sale.createdAt);
    if (revenueMap[key] !== undefined) revenueMap[key] += sale.totalAmount;
  });

  const data = labels.map(l => revenueMap[l]);

  if (chartInstance) chartInstance.destroy();

  const ctx = document.getElementById('revenue-chart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue ($)',
        data,
        fill: true,
        backgroundColor: 'rgba(79,70,229,0.08)',
        borderColor: '#4f46e5',
        borderWidth: 2.5,
        pointBackgroundColor: '#4f46e5',
        pointRadius: 4,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' $' + ctx.parsed.y.toFixed(2)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { callback: v => '$' + v }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderTopProducts(sales) {
  const productMap = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productMap[item.name]) productMap[item.name] = { qty: 0, revenue: 0 };
      productMap[item.name].qty += item.qty;
      productMap[item.name].revenue += item.price * item.qty;
    });
  });

  const sorted = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const tbody = document.getElementById('top-products-table');
  if (!sorted.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-box-open"></i>No sales data</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map(([name, d], i) => `
    <tr>
      <td><span style="width:22px;height:22px;background:#f1f5f9;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:600">${i + 1}</span></td>
      <td style="font-weight:500">${name}</td>
      <td>${d.qty}</td>
      <td style="font-weight:600;color:var(--success)">${fmt(d.revenue)}</td>
    </tr>
  `).join('');
}

function renderLowStock(products) {
  const low = products.filter(p => p.quantity <= p.threshold).slice(0, 8);
  const tbody = document.getElementById('low-stock-table');
  if (!low.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-check-circle" style="color:var(--success)"></i>All stocked up!</td></tr>';
    return;
  }
  tbody.innerHTML = low.map(p => `
    <tr>
      <td style="font-weight:500;color:var(--danger)">${p.name}</td>
      <td><span class="badge badge-gray">${p.category}</span></td>
      <td><span class="badge ${p.quantity === 0 ? 'badge-danger' : 'badge-warning'}">${p.quantity} left</span></td>
      <td>${p.threshold}</td>
    </tr>
  `).join('');
}

function renderRecentSales(sales) {
  const recent = sales.slice(0, 10);
  const tbody = document.getElementById('recent-sales-table');
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-receipt"></i>No recent sales</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(s => `
    <tr>
      <td style="font-family:monospace;font-size:0.8rem;color:var(--gray)">#${s._id.slice(-8).toUpperCase()}</td>
      <td>${s.customerName || 'Walk-in'}</td>
      <td>${s.items.length} item${s.items.length !== 1 ? 's' : ''}</td>
      <td style="font-weight:600;color:var(--success)">${fmt(s.totalAmount)}</td>
      <td><span class="badge ${s.paymentMethod === 'cash' ? 'badge-success' : 'badge-info'}">${s.paymentMethod}</span></td>
      <td>${s.employeeId ? s.employeeId.name : 'N/A'}</td>
      <td style="color:var(--gray);font-size:0.82rem">${fmtDate(s.createdAt)}</td>
    </tr>
  `).join('');
}

function updateSummaryCards(sales, products) {
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const lowCount = products.filter(p => p.quantity <= p.threshold).length;

  document.getElementById('card-revenue').textContent = fmt(todayRevenue);
  document.getElementById('card-orders').textContent = todaySales.length;
  document.getElementById('card-products').textContent = products.length;
  document.getElementById('card-lowstock').textContent = lowCount;
}

async function init() {
  if (!API.requireAuth()) return;
  setupUser();
  setupLogout();

  try {
    const [reportData, products] = await Promise.all([
      API.get('/reports/sales'),
      API.get('/products')
    ]);

    const sales = reportData.sales || [];
    updateSummaryCards(sales, products);
    renderChart(sales);
    renderTopProducts(sales);
    renderLowStock(products);
    renderRecentSales(sales);
  } catch (err) {
    console.error('Dashboard load error:', err.message);
  }
}

init();
