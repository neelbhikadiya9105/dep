/* inventory.js */
import API from './api.js';
import JsBarcode from 'jsbarcode';

let allProducts = [];
let editingId = null;

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // Hide Add Product button for staff
  if (!API.checkRole('owner', 'manager')) {
    document.getElementById('manager-actions').style.display = 'none';
  }
}

function setupLogout() {
  document.getElementById('logout-btn').addEventListener('click', () => {
    API.clearAuth();
    window.location.href = '/index.html';
  });
}

function showAlert(msg, type = 'error') {
  const box = document.getElementById('alert-box');
  box.innerHTML = `<div class="alert alert-${type}"><i class="fas fa-${type === 'error' ? 'circle-xmark' : type === 'success' ? 'circle-check' : 'info-circle'}"></i> ${msg}</div>`;
  setTimeout(() => box.innerHTML = '', 5000);
}

function updateSummaryCards(products) {
  const low = products.filter(p => p.quantity <= p.threshold).length;
  const totalValue = products.reduce((s, p) => s + p.costPrice * p.quantity, 0);
  const totalProfit = products.reduce((s, p) => s + (p.sellingPrice - p.costPrice) * p.quantity, 0);

  document.getElementById('card-total').textContent = products.length;
  document.getElementById('card-lowstock').textContent = low;
  document.getElementById('card-value').textContent = fmt(totalValue);
  document.getElementById('card-profit').textContent = fmt(totalProfit);
}

function populateCategories(products) {
  const cats = [...new Set(products.map(p => p.category))].sort();
  const filter = document.getElementById('category-filter');
  const datalist = document.getElementById('category-list');
  filter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  datalist.innerHTML = cats.map(c => `<option value="${c}">`).join('');
}

function renderTable(products) {
  const tbody = document.getElementById('products-table');
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-box-open"></i>No products found</td></tr>';
    return;
  }

  const isManager = API.checkRole('owner', 'manager');
  const isOwner = API.checkRole('owner');

  tbody.innerHTML = products.map(p => {
    const isLow = p.quantity <= p.threshold;
    const rowClass = isLow ? 'class="low-stock-row"' : '';
    const stockBadge = p.quantity === 0
      ? '<span class="badge badge-danger">Out of Stock</span>'
      : isLow
        ? '<span class="badge badge-warning">Low Stock</span>'
        : '<span class="badge badge-success">In Stock</span>';

    const actions = isManager ? `
      <button class="btn btn-outline btn-sm" onclick="openEdit('${p._id}')"><i class="fas fa-pencil"></i></button>
      <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p._id}', this)"><i class="fas fa-trash"></i></button>
    ` : '<span style="color:var(--gray);font-size:0.8rem">View only</span>';

    return `
      <tr ${rowClass}>
        <td style="font-weight:600">${p.name}</td>
        <td><span class="badge badge-gray">${p.category}</span></td>
        <td style="font-family:monospace;font-size:0.78rem;color:var(--gray)">${p.sku || '—'}</td>
        <td>${fmt(p.costPrice)}</td>
        <td>${fmt(p.sellingPrice)}</td>
        <td style="color:var(--success);font-weight:600">${fmt(p.profit || (p.sellingPrice - p.costPrice))}</td>
        <td style="font-weight:600;color:${isLow ? 'var(--danger)' : 'var(--dark)'}">${p.quantity}</td>
        <td style="color:var(--gray)">${p.threshold}</td>
        <td>${stockBadge}</td>
        <td style="display:flex;gap:5px">${actions}</td>
      </tr>
    `;
  }).join('');
}

function filterProducts() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const cat = document.getElementById('category-filter').value;
  const filtered = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search);
    const matchCat = !cat || p.category === cat;
    return matchSearch && matchCat;
  });
  renderTable(filtered);
}

function openModal(title = 'Add Product', product = null) {
  editingId = product ? product._id : null;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('product-id').value = editingId || '';
  document.getElementById('prod-name').value = product ? product.name : '';
  document.getElementById('prod-category').value = product ? product.category : '';
  document.getElementById('prod-cost').value = product ? product.costPrice : '';
  document.getElementById('prod-price').value = product ? product.sellingPrice : '';
  document.getElementById('prod-qty').value = product ? product.quantity : '';
  document.getElementById('prod-threshold').value = product ? product.threshold : 10;
  document.getElementById('prod-sku').value = product ? (product.sku || '') : '';
  document.getElementById('prod-barcode').value = product ? (product.barcode || '') : '';
  // Clear barcode preview
  const svgEl = document.getElementById('barcode-preview');
  if (svgEl) svgEl.innerHTML = '';
  // Render existing barcode
  if (product && product.barcode) renderBarcodePreview(product.barcode);
  document.getElementById('product-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('product-modal').classList.add('hidden');
  editingId = null;
}

function openEdit(id) {
  const product = allProducts.find(p => p._id === id);
  if (product) openModal('Edit Product', product);
}

async function deleteProduct(id, btnEl) {
  const product = allProducts.find(p => p._id === id);
  const name = product ? product.name : 'this product';
  if (!confirm(`Delete "${name}"?\n\nManagers will submit an approval request. Owners will delete immediately.`)) return;
  try {
    const res = await API.delete(`/products/${id}`);
    if (res.approval) {
      showAlert('Deletion request submitted for owner approval.', 'warning');
    } else {
      showAlert(`"${name}" deleted successfully.`, 'success');
    }
    await loadProducts();
  } catch (err) {
    showAlert(err.message);
  }
}

async function loadProducts() {
  try {
    allProducts = await API.get('/products');
    updateSummaryCards(allProducts);
    populateCategories(allProducts);
    filterProducts();
  } catch (err) {
    showAlert(err.message);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('save-btn');
  saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
  saveBtn.disabled = true;

  const body = {
    name: document.getElementById('prod-name').value.trim(),
    category: document.getElementById('prod-category').value.trim(),
    costPrice: parseFloat(document.getElementById('prod-cost').value),
    sellingPrice: parseFloat(document.getElementById('prod-price').value),
    quantity: parseInt(document.getElementById('prod-qty').value),
    threshold: parseInt(document.getElementById('prod-threshold').value) || 10,
    sku: document.getElementById('prod-sku').value.trim() || undefined,
    barcode: document.getElementById('prod-barcode').value.trim() || undefined,
    barcodeType: 'CODE128'
  };

  try {
    if (editingId) {
      await API.put(`/products/${editingId}`, body);
      showAlert('Product updated successfully.', 'success');
    } else {
      await API.post('/products', body);
      showAlert('Product added successfully.', 'success');
    }
    closeModal();
    await loadProducts();
  } catch (err) {
    showAlert(err.message);
  }

  saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Product';
  saveBtn.disabled = false;
}

function renderBarcodePreview(value) {
  const svgEl = document.getElementById('barcode-preview');
  if (!svgEl || !value) return;
  try {
    JsBarcode(svgEl, value, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 12
    });
  } catch (err) {
    svgEl.innerHTML = `<text fill="red">Invalid barcode: ${err.message}</text>`;
  }
}

function downloadBarcode() {
  const svgEl = document.getElementById('barcode-preview');
  if (!svgEl || !svgEl.innerHTML) return showAlert('Generate a barcode first.', 'warning');
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sku = document.getElementById('prod-sku').value || 'barcode';
  a.download = `${sku}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function generateBarcode() {
  let sku = document.getElementById('prod-sku').value.trim();
  if (!sku) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    sku = 'SKU-';
    for (let i = 0; i < 6; i++) sku += chars[Math.floor(Math.random() * chars.length)];
    document.getElementById('prod-sku').value = sku;
  }
  document.getElementById('prod-barcode').value = sku;
  renderBarcodePreview(sku);
}

function init() {
  if (!API.requireAuth()) return;
  setupUser();
  setupLogout();

  document.getElementById('add-product-btn').addEventListener('click', () => openModal('Add Product'));
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('product-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('search-input').addEventListener('input', filterProducts);
  document.getElementById('category-filter').addEventListener('change', filterProducts);

  const genBarcodeBtn = document.getElementById('gen-barcode-btn');
  if (genBarcodeBtn) genBarcodeBtn.addEventListener('click', generateBarcode);

  const dlBarcodeBtn = document.getElementById('dl-barcode-btn');
  if (dlBarcodeBtn) dlBarcodeBtn.addEventListener('click', downloadBarcode);

  const barcodeInput = document.getElementById('prod-barcode');
  if (barcodeInput) {
    barcodeInput.addEventListener('input', () => {
      renderBarcodePreview(barcodeInput.value.trim());
    });
  }

  document.getElementById('product-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('product-modal')) closeModal();
  });

  loadProducts();
}

init();

// Expose to window for inline onclick handlers
window.openEdit = openEdit;
window.deleteProduct = deleteProduct;

