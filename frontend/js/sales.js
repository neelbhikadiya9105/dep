/* sales.js - POS */

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

async function checkout() {
  if (!cart.length) return;

  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn.innerHTML = '<span class="spinner"></span> Processing...';
  checkoutBtn.disabled = true;

  const customerName = document.getElementById('customer-name').value.trim() || 'Walk-in';
  const paymentMethod = document.getElementById('payment-method').value;
  const totalAmount = getCartTotal();

  try {
    await API.post('/sales', {
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        price: item.price
      })),
      totalAmount,
      paymentMethod,
      customerName
    });

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

async function init() {
  if (!API.requireAuth()) return;
  setupUser();
  setupLogout();

  document.getElementById('product-search').addEventListener('input', filterProducts);
  document.getElementById('category-filter').addEventListener('change', filterProducts);
  document.getElementById('clear-cart-btn').addEventListener('click', () => {
    if (cart.length && confirm('Clear all items from cart?')) clearCart();
  });
  document.getElementById('checkout-btn').addEventListener('click', checkout);
  document.getElementById('new-sale-btn').addEventListener('click', () => {
    document.getElementById('success-modal').classList.add('hidden');
    document.getElementById('customer-name').value = '';
  });

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
