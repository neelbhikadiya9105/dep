/* sales.js - POS */
import API from './api.js';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { jsPDF } from 'jspdf';

let allProducts = [];
let cart = [];

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

function populateCategories(products) {
  const cats = [...new Set(products.map(p => p.category))].sort();
  const filter = document.getElementById('category-filter');
  filter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  if (!products.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray)"><i class="fas fa-box-open" style="font-size:3rem;opacity:0.3;display:block;margin-bottom:10px"></i>No products found</div>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const outOfStock = p.quantity === 0;
    const lowStock = p.quantity > 0 && p.quantity <= p.threshold;
    const stockClass = outOfStock ? 'stock-out' : lowStock ? 'stock-low' : 'stock-ok';
    const stockText = outOfStock ? 'Out of Stock' : `${p.quantity} in stock`;

    return `
      <div class="product-card ${outOfStock ? 'out-of-stock' : ''}" 
           data-id="${p._id}" 
           ${outOfStock ? '' : `onclick="addToCart('${p._id}')"`}>
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-cat">${p.category}</div>
        <div class="product-card-price">${fmt(p.sellingPrice)}</div>
        <div class="product-card-stock ${stockClass}">${stockText}</div>
      </div>
    `;
  }).join('');
}

function filterProducts() {
  const search = document.getElementById('product-search').value.toLowerCase();
  const cat = document.getElementById('category-filter').value;
  const filtered = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search);
    const matchCat = !cat || p.category === cat;
    return matchSearch && matchCat;
  });
  renderProducts(filtered);
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  const cartDiv = document.getElementById('cart-items');
  const checkoutBtn = document.getElementById('checkout-btn');

  if (!cart.length) {
    cartDiv.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-cart-shopping"></i>
        <p>Cart is empty</p>
        <p style="font-size:0.8rem">Click products to add them</p>
      </div>
    `;
    checkoutBtn.disabled = true;
  } else {
    cartDiv.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <div class="cart-item-name">
          ${item.name}
          <span>${fmt(item.price)} each</span>
        </div>
        <div class="cart-qty">
          <button class="qty-btn" onclick="changeQty(${i}, -1)"><i class="fas fa-minus"></i></button>
          <span style="font-weight:600;min-width:20px;text-align:center">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i}, 1)"><i class="fas fa-plus"></i></button>
        </div>
        <div class="cart-item-price">${fmt(item.price * item.qty)}</div>
        <button class="cart-remove" onclick="removeFromCart(${i})"><i class="fas fa-xmark"></i></button>
      </div>
    `).join('');
    checkoutBtn.disabled = false;
  }

  const total = getCartTotal();
  document.getElementById('subtotal').textContent = fmt(total);
  document.getElementById('total').textContent = fmt(total);
}

function addToCart(productId) {
  const product = allProducts.find(p => p._id === productId);
  if (!product || product.quantity === 0) return;

  const existing = cart.find(item => item.productId === productId);
  const currentQty = existing ? existing.qty : 0;

  if (currentQty >= product.quantity) {
    showAlert(`Only ${product.quantity} units available for "${product.name}".`, 'warning');
    return;
  }

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      sku: product.sku || '',
      price: product.sellingPrice,
      qty: 1,
      maxQty: product.quantity
    });
  }

  renderCart();
}

function changeQty(index, delta) {
  const item = cart[index];
  const product = allProducts.find(p => p._id === item.productId);
  const maxQty = product ? product.quantity : item.maxQty;

  item.qty += delta;
  if (item.qty < 1) {
    cart.splice(index, 1);
  } else if (item.qty > maxQty) {
    item.qty = maxQty;
    showAlert(`Max available: ${maxQty}`, 'warning');
  }
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

let lastSale = null;
let html5Scanner = null;

async function checkout() {
  if (!cart.length) return;

  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn.innerHTML = '<span class="spinner"></span> Processing...';
  checkoutBtn.disabled = true;

  const customerName = document.getElementById('customer-name').value.trim() || 'Walk-in';
  const paymentMethod = document.getElementById('payment-method').value;
  const totalAmount = getCartTotal();
  const storeId = getSelectedStoreId();

  try {
    const sale = await API.post('/sales', {
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku || '',
        qty: item.qty,
        price: item.price
      })),
      totalAmount,
      paymentMethod,
      customerName,
      storeId: storeId || undefined
    });

    lastSale = sale;

    // Show success modal
    document.getElementById('success-customer').textContent = `Customer: ${customerName}`;
    document.getElementById('success-amount').textContent = fmt(totalAmount);
    document.getElementById('success-payment').textContent = `Payment: ${paymentMethod.toUpperCase()}`;
    document.getElementById('success-modal').classList.remove('hidden');

    // Refresh products and clear cart
    clearCart();
    allProducts = await API.get('/products');
    filterProducts();

  } catch (err) {
    showAlert(err.message);
  }

  checkoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Process Sale';
  checkoutBtn.disabled = false;
}

// ---- Barcode Scanner ----

function openScannerModal() {
  document.getElementById('scanner-modal').classList.remove('hidden');
  const readerDiv = document.getElementById('qr-reader');
  readerDiv.innerHTML = '';
  html5Scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
  html5Scanner.render(onScanSuccess, onScanError);
}

function closeScannerModal() {
  document.getElementById('scanner-modal').classList.add('hidden');
  if (html5Scanner) {
    html5Scanner.clear().catch(() => {});
    html5Scanner = null;
  }
  document.getElementById('qr-reader').innerHTML = '';
}

async function onScanSuccess(decodedText) {
  closeScannerModal();
  await lookupAndAddByBarcode(decodedText);
}

function onScanError() {}

async function lookupAndAddByBarcode(barcode) {
  if (!barcode) return;
  try {
    const product = await API.get(`/products/lookup?barcode=${encodeURIComponent(barcode)}`);
    // Sync with allProducts
    const existing = allProducts.find(p => p._id === product._id);
    if (!existing) allProducts.push(product);
    addToCart(product._id);
    showAlert(`"${product.name}" added to cart.`, 'success');
  } catch (err) {
    showAlert(`Barcode not found: ${barcode}`, 'error');
  }
}

// ---- Receipt ----

function buildReceiptHTML(sale) {
  const storeName = 'Inventory Avengers';
  const date = new Date(sale.createdAt || Date.now()).toLocaleString();
  const receiptNum = sale.receiptNumber || sale._id || 'N/A';
  const items = sale.items || [];
  const subtotal = sale.subtotal || sale.totalAmount;
  const tax = sale.tax || 0;
  const total = sale.totalAmount;

  return `
    <div class="receipt-preview-inner">
      <div style="text-align:center;margin-bottom:12px">
        <strong style="font-size:1.1rem">${storeName}</strong><br/>
        <small style="color:var(--gray)">Receipt #${receiptNum}</small><br/>
        <small style="color:var(--gray)">${date}</small>
      </div>
      <div style="margin-bottom:8px;font-size:0.85rem"><strong>Customer:</strong> ${sale.customerName || 'Walk-in'}</div>
      <div style="margin-bottom:8px;font-size:0.85rem"><strong>Payment:</strong> ${(sale.paymentMethod || '').toUpperCase()}</div>
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:12px">
        <thead>
          <tr style="border-bottom:1px solid #e2e8f0">
            <th style="text-align:left;padding:4px 0">Item</th>
            <th style="text-align:center;padding:4px 0">Qty</th>
            <th style="text-align:right;padding:4px 0">Price</th>
            <th style="text-align:right;padding:4px 0">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="padding:3px 0">${it.name}</td>
              <td style="text-align:center;padding:3px 0">${it.qty}</td>
              <td style="text-align:right;padding:3px 0">$${Number(it.price).toFixed(2)}</td>
              <td style="text-align:right;padding:3px 0">$${(it.price * it.qty).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="font-size:0.85rem">
        <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>$${Number(subtotal).toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>Tax</span><span>$${Number(tax).toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1rem;margin-top:6px;border-top:2px solid var(--dark);padding-top:6px">
          <span>Total</span><span>$${Number(total).toFixed(2)}</span>
        </div>
      </div>
      <div style="text-align:center;margin-top:14px;color:var(--gray);font-size:0.8rem">Thank you for your purchase!</div>
    </div>
  `;
}

function showReceiptPreview() {
  if (!lastSale) return;
  document.getElementById('receipt-content').innerHTML = buildReceiptHTML(lastSale);
  document.getElementById('receipt-modal').classList.remove('hidden');
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').classList.add('hidden');
}

function downloadReceiptPDF() {
  if (!lastSale) return;
  const doc = new jsPDF({ format: 'a6', unit: 'mm' });
  const sale = lastSale;
  const margin = 10;
  let y = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Inventory Avengers', 74, y, { align: 'center' });
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt #${sale.receiptNumber || sale._id || 'N/A'}`, 74, y, { align: 'center' });
  y += 5;
  doc.text(new Date(sale.createdAt || Date.now()).toLocaleString(), 74, y, { align: 'center' });
  y += 7;

  doc.text(`Customer: ${sale.customerName || 'Walk-in'}`, margin, y); y += 5;
  doc.text(`Payment: ${(sale.paymentMethod || '').toUpperCase()}`, margin, y); y += 7;

  // Items header
  doc.setFont('helvetica', 'bold');
  doc.text('Item', margin, y);
  doc.text('Qty', 90, y, { align: 'right' });
  doc.text('Price', 114, y, { align: 'right' });
  doc.text('Total', 138, y, { align: 'right' });
  y += 2;
  doc.line(margin, y, 148 - margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  for (const it of (sale.items || [])) {
    doc.text(String(it.name).substring(0, 30), margin, y);
    doc.text(String(it.qty), 90, y, { align: 'right' });
    doc.text(`$${Number(it.price).toFixed(2)}`, 114, y, { align: 'right' });
    doc.text(`$${(it.price * it.qty).toFixed(2)}`, 138, y, { align: 'right' });
    y += 5;
  }

  y += 2;
  doc.line(margin, y, 148 - margin, y);
  y += 4;

  doc.setFontSize(9);
  const subtotal = sale.subtotal || sale.totalAmount;
  doc.text(`Subtotal: $${Number(subtotal).toFixed(2)}`, 138, y, { align: 'right' }); y += 5;
  doc.text(`Tax: $${Number(sale.tax || 0).toFixed(2)}`, 138, y, { align: 'right' }); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Total: $${Number(sale.totalAmount).toFixed(2)}`, 138, y, { align: 'right' }); y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Thank you for your purchase!', 74, y, { align: 'center' });

  doc.save(`receipt-${sale.receiptNumber || sale._id || 'sale'}.pdf`);
}

function getSelectedStoreId() {
  const user = API.getUser();
  if (!user) return '';
  if (user.role !== 'owner') return user.storeId || '';
  return localStorage.getItem('selectedStoreId') || '';
}

async function setupStoreSelector() {
  const sel = document.getElementById('store-selector');
  if (!sel) return;
  const user = API.getUser();
  if (!user) return;

  if (user.role === 'owner') {
    sel.style.display = 'block';
    try {
      const stores = await API.get('/stores');
      sel.innerHTML = '<option value="">All Stores</option>' +
        stores.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
    } catch (_) {}
    sel.addEventListener('change', () => {
      localStorage.setItem('selectedStoreId', sel.value);
      reloadProducts();
    });
    const saved = localStorage.getItem('selectedStoreId');
    if (saved) sel.value = saved;
  } else {
    sel.style.display = 'none';
  }
}

async function reloadProducts() {
  try {
    allProducts = await API.get('/products');
    populateCategories(allProducts);
    filterProducts();
  } catch (err) {
    showAlert(err.message);
  }
}

async function init() {
  if (!API.requireAuth()) return;
  setupUser();
  setupLogout();
  await setupStoreSelector();

  document.getElementById('product-search').addEventListener('input', filterProducts);
  document.getElementById('category-filter').addEventListener('change', filterProducts);
  document.getElementById('clear-cart-btn').addEventListener('click', () => {
    if (cart.length && confirm('Clear all items from cart?')) clearCart();
  });
  document.getElementById('checkout-btn').addEventListener('click', checkout);
  document.getElementById('new-sale-btn').addEventListener('click', () => {
    document.getElementById('success-modal').classList.add('hidden');
    document.getElementById('customer-name').value = '';
    lastSale = null;
  });

  // Barcode scanner
  const scanBtn = document.getElementById('scan-barcode-btn');
  if (scanBtn) scanBtn.addEventListener('click', openScannerModal);

  const closeScannerBtn = document.getElementById('close-scanner-btn');
  if (closeScannerBtn) closeScannerBtn.addEventListener('click', closeScannerModal);

  const manualLookupBtn = document.getElementById('manual-barcode-btn');
  if (manualLookupBtn) {
    manualLookupBtn.addEventListener('click', () => {
      const val = document.getElementById('manual-barcode-input').value.trim();
      if (val) {
        closeScannerModal();
        lookupAndAddByBarcode(val);
      }
    });
  }

  // Receipt
  const previewReceiptBtn = document.getElementById('preview-receipt-btn');
  if (previewReceiptBtn) previewReceiptBtn.addEventListener('click', showReceiptPreview);

  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', downloadReceiptPDF);

  const closeReceiptBtn = document.getElementById('close-receipt-btn');
  if (closeReceiptBtn) closeReceiptBtn.addEventListener('click', closeReceiptModal);

  const printReceiptBtn = document.getElementById('print-receipt-btn');
  if (printReceiptBtn) printReceiptBtn.addEventListener('click', () => window.print());

  try {
    allProducts = await API.get('/products');
    populateCategories(allProducts);
    renderProducts(allProducts);
  } catch (err) {
    showAlert(err.message);
  }

  renderCart();
}

init();

// Expose to window for inline onclick handlers
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;

