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
import { fmt } from '../utils/helpers.js';

export default function Sales() {
  const user = useAuthStore((s) => s.user);
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
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(
    () => localStorage.getItem('selectedStoreId') || ''
  );
  const scannerRef = useRef(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const getStoreId = useCallback(() => {
    if (!user) return '';
    if (user.role !== 'owner') return user.storeId || '';
    return selectedStoreId;
  }, [user, selectedStoreId]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await apiGet('/products');
      setProducts(data);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    if (user?.role === 'owner') {
      apiGet('/stores').then(setStores).catch(() => {});
    }
  }, [loadProducts, user]);

  const categories = [...new Set(products.map((p) => p.category))].sort();

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const addToCart = (product) => {
    if (product.quantity === 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        if (existing.qty >= product.quantity) {
          showAlert(`Only ${product.quantity} units available for "${product.name}".`, 'warning');
          return prev;
        }
        return prev.map((i) =>
          i.productId === product._id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, {
        productId: product._id,
        name: product.name,
        sku: product.sku || '',
        price: product.sellingPrice,
        qty: 1,
        maxQty: product.quantity,
      }];
    });
  };

  const changeQty = (productId, delta) => {
    const product = products.find((p) => p._id === productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.qty + delta;
          if (newQty < 1) return null;
          if (newQty > (product?.quantity ?? item.maxQty)) {
            showAlert(`Max available: ${product?.quantity ?? item.maxQty}`, 'warning');
            return item;
          }
          return { ...item, qty: newQty };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => {
    if (cart.length && confirm('Clear all items from cart?')) setCart([]);
  };

  const checkout = async () => {
    if (!cart.length) return;
    setProcessing(true);
    const storeId = getStoreId();
    try {
      const sale = await apiPost('/sales', {
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku || '',
          qty: item.qty,
          price: item.price,
        })),
        totalAmount: cartTotal,
        paymentMethod,
        customerName: customerName.trim() || 'Walk-in',
        storeId: storeId || undefined,
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

  // Barcode scanner
  const openScanner = () => {
    setScannerModalOpen(true);
  };

  useEffect(() => {
    if (!scannerModalOpen) return;
    const timer = setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scannerRef.current.render(
        async (decoded) => {
          closeScannerModal();
          await lookupBarcode(decoded);
        },
        () => {}
      );
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
      setProducts((prev) => {
        if (!prev.find((p) => p._id === product._id)) return [...prev, product];
        return prev;
      });
      addToCart(product);
      showAlert(`"${product.name}" added to cart.`, 'success');
    } catch {
      showAlert(`Barcode not found: ${barcode}`, 'error');
    }
  };

  // Receipt PDF
  const downloadReceiptPDF = () => {
    if (!lastSale) return;
    const sale = lastSale;
    const doc = new jsPDF({ format: 'a6', unit: 'mm' });
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
  };

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      <div className="grid lg:grid-cols-5 gap-5 h-[calc(100vh-130px)]">
        {/* Left: Product grid */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                className="form-control pl-9"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="form-control w-40" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={openScanner} className="btn btn-outline shrink-0" title="Scan barcode">
              <FiCamera size={16} />
            </button>
          </div>

          {/* Store selector (owner) */}
          {user?.role === 'owner' && stores.length > 0 && (
            <select
              className="form-control"
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value);
                localStorage.setItem('selectedStoreId', e.target.value);
              }}
            >
              <option value="">All Stores</option>
              {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          )}

          {/* Product grid */}
          {loading ? (
            <LoadingSpinner text="Loading products..." />
          ) : (
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400">No products found</div>
              ) : (
                filteredProducts.map((p) => {
                  const outOfStock = p.quantity === 0;
                  const lowStock = p.quantity > 0 && p.quantity <= p.threshold;
                  return (
                    <div
                      key={p._id}
                      onClick={() => !outOfStock && addToCart(p)}
                      className={`product-card ${outOfStock ? 'out-of-stock' : ''}`}
                    >
                      <div className="font-semibold text-slate-800 text-sm mb-1 truncate">{p.name}</div>
                      <div className="text-xs text-slate-400 mb-2">{p.category}</div>
                      <div className="text-indigo-600 font-bold">{fmt(p.sellingPrice)}</div>
                      <div className={`text-xs mt-1 ${outOfStock ? 'text-red-500' : lowStock ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {outOfStock ? 'Out of Stock' : `${p.quantity} in stock`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="lg:col-span-2 card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FiShoppingCart size={16} /> Cart ({cart.length})
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700">
                <FiTrash2 size={13} />
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FiShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs">Click products to add them</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{item.name}</div>
                    <div className="text-xs text-slate-400">{fmt(item.price)} each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(item.productId, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 hover:bg-slate-300 text-slate-600"
                    >
                      <FiMinus size={10} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold">{item.qty}</span>
                    <button
                      onClick={() => changeQty(item.productId, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 hover:bg-slate-300 text-slate-600"
                    >
                      <FiPlus size={10} />
                    </button>
                  </div>
                  <div className="text-sm font-bold text-slate-800 w-16 text-right">
                    {fmt(item.price * item.qty)}
                  </div>
                  <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-red-500">
                    <FiX size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Checkout */}
          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-bold">{fmt(cartTotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-slate-100 pt-2">
              <span>Total</span>
              <span className="text-indigo-600">{fmt(cartTotal)}</span>
            </div>

            <input
              className="form-control"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <select
              className="form-control"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
            </select>

            <button
              onClick={checkout}
              disabled={!cart.length || processing}
              className="btn btn-primary w-full justify-center py-3"
            >
              {processing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {processing ? 'Processing...' : 'Process Sale'}
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal isOpen={successModalOpen} onClose={() => setSuccessModalOpen(false)} title="Sale Complete!">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-emerald-600 text-3xl">✓</span>
          </div>
          {lastSale && (
            <div className="space-y-1 text-sm">
              <p className="text-slate-600">Customer: <strong>{lastSale.customerName || 'Walk-in'}</strong></p>
              <p className="text-2xl font-bold text-indigo-600">{fmt(lastSale.totalAmount)}</p>
              <p className="text-slate-500">Payment: {lastSale.paymentMethod?.toUpperCase()}</p>
            </div>
          )}
          <div className="flex gap-2 justify-center pt-2">
            <button onClick={() => setReceiptModalOpen(true)} className="btn btn-outline">
              <FiFileText size={15} /> View Receipt
            </button>
            <button onClick={downloadReceiptPDF} className="btn btn-outline">
              Download PDF
            </button>
            <button onClick={() => setSuccessModalOpen(false)} className="btn btn-primary">
              New Sale
            </button>
          </div>
        </div>
      </Modal>

      {/* Scanner Modal */}
      <Modal isOpen={scannerModalOpen} onClose={closeScannerModal} title="Scan Barcode">
        <div id="qr-reader" className="w-full" />
        <div className="mt-4">
          <p className="text-sm text-slate-500 mb-2">Or enter barcode manually:</p>
          <div className="flex gap-2">
            <input
              className="form-control flex-1"
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
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal isOpen={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} title="Receipt Preview">
        {lastSale && (
          <div className="font-mono text-sm">
            <div className="text-center mb-4">
              <div className="font-bold text-lg">Inventory Avengers</div>
              <div className="text-slate-500 text-xs">Receipt #{lastSale.receiptNumber || lastSale._id}</div>
              <div className="text-slate-500 text-xs">{new Date(lastSale.createdAt || Date.now()).toLocaleString()}</div>
            </div>
            <div className="mb-2 text-xs"><strong>Customer:</strong> {lastSale.customerName || 'Walk-in'}</div>
            <div className="mb-3 text-xs"><strong>Payment:</strong> {lastSale.paymentMethod?.toUpperCase()}</div>
            <table className="w-full text-xs border-collapse mb-3">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-1">Item</th>
                  <th className="text-center py-1">Qty</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {lastSale.items?.map((it, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1">{it.name}</td>
                    <td className="text-center py-1">{it.qty}</td>
                    <td className="text-right py-1">${Number(it.price).toFixed(2)}</td>
                    <td className="text-right py-1">${(it.price * it.qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span>Subtotal</span><span>${Number(lastSale.subtotal || lastSale.totalAmount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>${Number(lastSale.tax || 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-1 mt-1">
                <span>Total</span><span>${Number(lastSale.totalAmount).toFixed(2)}</span>
              </div>
            </div>
            <div className="text-center text-xs text-slate-400 mt-4">Thank you for your purchase!</div>
            <div className="flex gap-2 mt-4">
              <button onClick={downloadReceiptPDF} className="btn btn-primary w-full justify-center">
                Download PDF
              </button>
              <button onClick={() => window.print()} className="btn btn-outline">Print</button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
