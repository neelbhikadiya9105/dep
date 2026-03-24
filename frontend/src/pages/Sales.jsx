import { useState, useEffect, useCallback, useRef } from 'react';
import { FiSearch, FiShoppingCart, FiX, FiPlus, FiMinus, FiCamera, FiTrash2, FiFileText } from 'react-icons/fi';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { jsPDF } from 'jspdf';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPost } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import { formatCurrency } from '../utils/currency.js';
import '../styles/sales-page.css';

export default function Sales() {
  const user = useAuthStore((s) => s.user);
  const shopBranding = useAuthStore((s) => s.shopBranding);
  const currency = user?.currency || 'INR';
  const fmt = (value) => formatCurrency(value, currency);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const scannerRef = useRef(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadProducts = useCallback(async () => {
    try {
      const data = await apiGet('/products');
      setProducts(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = [...new Set(products.map((product) => product.category))].sort();
  const filteredProducts = products.filter((product) => {
    const matchSearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || product.category === categoryFilter;
    return matchSearch && matchCat;
  });
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const addToCart = (product) => {
    if (product.quantity === 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        if (existing.qty >= product.quantity) {
          showAlert(`Only ${product.quantity} units available for "${product.name}".`, 'warning');
          return prev;
        }
        return prev.map((item) => (item.productId === product._id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { productId: product._id, name: product.name, sku: product.sku || '', price: product.sellingPrice, qty: 1, maxQty: product.quantity }];
    });
  };

  const changeQty = (productId, delta) => {
    const product = products.find((entry) => entry._id === productId);
    setCart((prev) => prev.map((item) => {
      if (item.productId !== productId) return item;
      const newQty = item.qty + delta;
      if (newQty < 1) return null;
      if (newQty > (product?.quantity ?? item.maxQty)) {
        showAlert(`Max available: ${product?.quantity ?? item.maxQty}`, 'warning');
        return item;
      }
      return { ...item, qty: newQty };
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => setCart((prev) => prev.filter((item) => item.productId !== productId));
  const clearCart = () => { if (cart.length && confirm('Clear all items from cart?')) setCart([]); };

  const checkout = async () => {
    if (!cart.length) return;
    setProcessing(true);
    try {
      const sale = await apiPost('/sales', {
        items: cart.map((item) => ({ productId: item.productId, name: item.name, sku: item.sku || '', qty: item.qty, price: item.price })),
        totalAmount: cartTotal,
        paymentMethod,
        customerName: customerName.trim() || 'Walk-in',
      });
      setLastSale(sale);
      setCart([]);
      setCustomerName('');
      setSuccessModalOpen(true);
      await loadProducts();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (!scannerModalOpen) return;
    const timer = setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scannerRef.current.render(async (decoded) => {
        closeScannerModal();
        await lookupBarcode(decoded);
      }, () => {});
    }, 100);
    return () => clearTimeout(timer);
  }, [scannerModalOpen]);

  const closeScannerModal = () => {
    setScannerModalOpen(false);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
  };

  const lookupBarcode = async (barcode) => {
    if (!barcode) return;
    try {
      const product = await apiGet(`/products/lookup?barcode=${encodeURIComponent(barcode)}`);
      setProducts((prev) => (!prev.find((entry) => entry._id === product._id) ? [...prev, product] : prev));
      addToCart(product);
      showAlert(`"${product.name}" added to cart.`, 'success');
    } catch {
      showAlert(`Barcode not found: ${barcode}`, 'error');
    }
  };

  const downloadReceiptPDF = () => {
    if (!lastSale) return;
    const sale = lastSale;
    const doc = new jsPDF({ format: 'a6', unit: 'mm' });
    const margin = 10;
    let y = margin;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const shopName = shopBranding?.shopName || shopBranding?.name || 'Inventory Avengers';
    doc.text(shopName, 74, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #${sale.receiptNumber || sale._id || 'N/A'}`, 74, y, { align: 'center' });
    y += 5;
    doc.text(new Date(sale.createdAt || Date.now()).toLocaleString(), 74, y, { align: 'center' });
    y += 7;
    doc.text(`Customer: ${sale.customerName || 'Walk-in'}`, margin, y); y += 5;
    doc.text(`Payment: ${(sale.paymentMethod || '').toUpperCase()}`, margin, y); y += 7;

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
    for (const item of sale.items || []) {
      doc.text(String(item.name).substring(0, 30), margin, y);
      doc.text(String(item.qty), 90, y, { align: 'right' });
      doc.text(fmt(item.price), 114, y, { align: 'right' });
      doc.text(fmt(item.price * item.qty), 138, y, { align: 'right' });
      y += 5;
    }
    y += 2;
    doc.line(margin, y, 148 - margin, y);
    y += 4;
    const subtotal = sale.subtotal || sale.totalAmount;
    doc.setFontSize(9);
    doc.text(`Subtotal: ${fmt(subtotal)}`, 138, y, { align: 'right' }); y += 5;
    doc.text(`Tax: ${fmt(sale.tax || 0)}`, 138, y, { align: 'right' }); y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total: ${fmt(sale.totalAmount)}`, 138, y, { align: 'right' }); y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const footerMsg = shopBranding?.receiptFooter || 'Thank you for your purchase!';
    doc.text(footerMsg, 74, y, { align: 'center' }); y += 5;
    if (shopBranding?.address) { doc.text(shopBranding.address, 74, y, { align: 'center' }); y += 5; }
    if (shopBranding?.phone) { doc.text(`Tel: ${shopBranding.phone}`, 74, y, { align: 'center' }); y += 4; }
    if (shopBranding?.email) { doc.text(shopBranding.email, 74, y, { align: 'center' }); }
    doc.save(`receipt-${sale.receiptNumber || sale._id || 'sale'}.pdf`);
  };

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      <div className="sales-layout">
        <div className="sales-left">
          <div className="sales-filters">
            <div className="sales-search">
              <FiSearch className="sales-search-icon" size={15} />
              <input className="form-control has-icon" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="form-control sales-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <button type="button" onClick={() => setScannerModalOpen(true)} className="btn btn-outline" title="Scan barcode">
              <FiCamera size={16} />
            </button>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading products..." />
          ) : (
            <div className="sales-grid">
              {filteredProducts.length === 0 ? (
                <div className="sales-empty">No products found</div>
              ) : (
                filteredProducts.map((product) => {
                  const outOfStock = product.quantity === 0;
                  const lowStock = product.quantity > 0 && product.quantity <= product.threshold;
                  return (
                    <div key={product._id} onClick={() => !outOfStock && addToCart(product)} className={`product-card ${outOfStock ? 'out-of-stock' : ''}`}>
                      <div className="sales-product-name">{product.name}</div>
                      <div className="sales-product-category">{product.category}</div>
                      <div className="sales-product-price">{fmt(product.sellingPrice)}</div>
                      <div className={`sales-product-stock ${outOfStock ? 'text-danger' : lowStock ? 'text-warning' : 'text-success'}`}>
                        {outOfStock ? 'Out of Stock' : `${product.quantity} in stock`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="panel sales-right">
          <div className="sales-cart-head">
            <div className="sales-cart-title"><FiShoppingCart size={16} /> Cart ({cart.length})</div>
            {cart.length > 0 && <button type="button" onClick={clearCart} className="sales-clear"><FiTrash2 size={13} /></button>}
          </div>

          <div className="sales-cart-body">
            {cart.length === 0 ? (
              <div className="sales-cart-empty">
                <FiShoppingCart size={36} className="sales-cart-empty-icon" />
                <p className="sales-cart-empty-title">Cart is empty</p>
                <p className="sales-cart-empty-subtitle">Click products to add them</p>
              </div>
            ) : (
              <div className="sales-cart-list">
                {cart.map((item) => (
                  <div key={item.productId} className="sales-cart-item">
                    <div className="sales-cart-info">
                      <div className="sales-cart-name">{item.name}</div>
                      <div className="sales-cart-price">{fmt(item.price)} each</div>
                    </div>
                    <div className="sales-qty">
                      <button type="button" onClick={() => changeQty(item.productId, -1)} className="sales-qty-btn"><FiMinus size={10} /></button>
                      <span className="sales-qty-value">{item.qty}</span>
                      <button type="button" onClick={() => changeQty(item.productId, 1)} className="sales-qty-btn"><FiPlus size={10} /></button>
                    </div>
                    <div className="sales-cart-total">{fmt(item.price * item.qty)}</div>
                    <button type="button" onClick={() => removeFromCart(item.productId)} className="sales-remove"><FiX size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sales-checkout stack-md">
            <div className="sales-summary-row"><span className="sales-summary-label">Subtotal</span><strong>{fmt(cartTotal)}</strong></div>
            <div className="sales-summary-total"><span>Total</span><span>{fmt(cartTotal)}</span></div>
            <input className="form-control" placeholder="Customer name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
            </select>
            <button type="button" onClick={checkout} disabled={!cart.length || processing} className="btn btn-primary btn-block">
              {processing ? <span className="loading-spinner size-sm inline-light" /> : null}
              {processing ? 'Processing...' : 'Process Sale'}
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={successModalOpen} onClose={() => setSuccessModalOpen(false)} title="Sale Complete!">
        <div className="sales-success">
          <div className="sales-success-icon">?</div>
          {lastSale && (
            <div className="sales-success-details">
              <p className="sales-success-name">Customer: <strong>{lastSale.customerName || 'Walk-in'}</strong></p>
              <p className="sales-success-total">{fmt(lastSale.totalAmount)}</p>
              <p className="sales-success-method">Payment: {lastSale.paymentMethod?.toUpperCase()}</p>
            </div>
          )}
          <div className="sales-success-actions">
            <button type="button" onClick={() => setReceiptModalOpen(true)} className="btn btn-outline"><FiFileText size={15} /> View Receipt</button>
            <button type="button" onClick={downloadReceiptPDF} className="btn btn-outline">Download PDF</button>
            <button type="button" onClick={() => setSuccessModalOpen(false)} className="btn btn-primary">New Sale</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={scannerModalOpen} onClose={closeScannerModal} title="Scan Barcode">
        <div id="qr-reader" />
        <p className="sales-scanner-help">Or enter barcode manually:</p>
        <div className="sales-inline-row">
          <input
            className="form-control"
            placeholder="Enter barcode..."
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualBarcode.trim()) {
                closeScannerModal();
                lookupBarcode(manualBarcode.trim());
                setManualBarcode('');
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (manualBarcode.trim()) {
                closeScannerModal();
                lookupBarcode(manualBarcode.trim());
                setManualBarcode('');
              }
            }}
            className="btn btn-primary"
          >
            Lookup
          </button>
        </div>
      </Modal>

      <Modal isOpen={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} title="Receipt Preview">
        {lastSale && (
          <div className="sales-receipt">
            <div className="sales-receipt-head">
              <div className="sales-receipt-brand">Inventory Avengers</div>
              {(shopBranding?.shopName || shopBranding?.name) && <div className="sales-receipt-brand sales-receipt-brand--subtle">{shopBranding.shopName || shopBranding.name}</div>}
              {shopBranding?.address && <div className="sales-receipt-muted">{shopBranding.address}</div>}
              {shopBranding?.phone && <div className="sales-receipt-muted">{shopBranding.phone}</div>}
              {shopBranding?.email && <div className="sales-receipt-muted">{shopBranding.email}</div>}
              <div className="sales-receipt-muted">Receipt #{lastSale.receiptNumber || lastSale._id}</div>
              <div className="sales-receipt-muted">{new Date(lastSale.createdAt || Date.now()).toLocaleString()}</div>
            </div>
            <div className="sales-receipt-line"><strong>Customer:</strong> {lastSale.customerName || 'Walk-in'}</div>
            <div className="sales-receipt-line"><strong>Payment:</strong> {lastSale.paymentMethod?.toUpperCase()}</div>
            <table className="sales-receipt-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lastSale.items?.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td style={{ textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(item.price)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(item.price * item.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sales-receipt-summary">
              <div className="sales-receipt-summary-row"><span>Subtotal</span><span>{fmt(lastSale.subtotal || lastSale.totalAmount)}</span></div>
              <div className="sales-receipt-summary-row"><span>Tax</span><span>{fmt(lastSale.tax || 0)}</span></div>
              <div className="sales-receipt-summary-total"><span>Total</span><span>{fmt(lastSale.totalAmount)}</span></div>
            </div>
            <div className="sales-receipt-thanks">Thank you for your purchase!</div>
            {shopBranding?.receiptFooter && <div className="sales-receipt-thanks sales-receipt-footer-note">{shopBranding.receiptFooter}</div>}
            <div className="sales-receipt-actions">
              <button type="button" onClick={downloadReceiptPDF} className="btn btn-primary btn-block">Download PDF</button>
              <button type="button" onClick={() => window.print()} className="btn btn-outline">Print</button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
