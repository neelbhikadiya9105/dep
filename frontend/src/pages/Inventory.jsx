import { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiBarChart2, FiDownload } from 'react-icons/fi';
import JsBarcode from 'jsbarcode';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import Alert from '../components/ui/Alert.jsx';
import Card from '../components/ui/Card.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/axios.js';
import useAuthStore from '../store/authStore.js';
import { fmt } from '../utils/helpers.js';

const EMPTY_FORM = {
  name: '', category: '', costPrice: '', sellingPrice: '',
  quantity: '', threshold: '10', sku: '', barcode: '', barcodeType: 'CODE128',
};

export default function Inventory() {
  const { checkRole } = useAuthStore();
  const isManager = checkRole('owner', 'manager');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const svgRef = useRef(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

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
  }, [loadProducts]);

  const filtered = products.filter((product) => {
    const matchSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || product.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(products.map((product) => product.category))].sort();
  const totalValue = products.reduce((sum, product) => sum + product.costPrice * product.quantity, 0);
  const totalProfit = products.reduce((sum, product) => sum + (product.sellingPrice - product.costPrice) * product.quantity, 0);
  const lowCount = products.filter((product) => product.quantity <= product.threshold).length;

  const openModal = (product = null) => {
    setEditingId(product?._id || null);
    setForm(product ? {
      name: product.name || '',
      category: product.category || '',
      costPrice: product.costPrice ?? '',
      sellingPrice: product.sellingPrice ?? '',
      quantity: product.quantity ?? '',
      threshold: product.threshold ?? 10,
      sku: product.sku || '',
      barcode: product.barcode || '',
      barcodeType: product.barcodeType || 'CODE128',
    } : EMPTY_FORM);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!svgRef.current || !form.barcode) return;
    try {
      JsBarcode(svgRef.current, form.barcode, {
        format: 'CODE128', width: 2, height: 50, displayValue: true, fontSize: 11,
      });
    } catch {
      if (svgRef.current) svgRef.current.innerHTML = '';
    }
  }, [form.barcode, modalOpen]);

  const generateBarcode = () => {
    let sku = form.sku.trim();
    if (!sku) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      sku = 'SKU-';
      for (let i = 0; i < 6; i += 1) sku += chars[Math.floor(Math.random() * chars.length)];
    }
    setForm((prev) => ({ ...prev, sku, barcode: sku }));
  };

  const downloadBarcode = () => {
    if (!svgRef.current || !svgRef.current.innerHTML) return showAlert('Generate a barcode first.', 'warning');
    const svgStr = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form.sku || 'barcode'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name.trim(),
      category: form.category.trim(),
      costPrice: parseFloat(form.costPrice),
      sellingPrice: parseFloat(form.sellingPrice),
      quantity: parseInt(form.quantity, 10),
      threshold: parseInt(form.threshold, 10) || 10,
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      barcodeType: 'CODE128',
    };
    try {
      if (editingId) {
        await apiPut(`/products/${editingId}`, body);
        showAlert('Product updated successfully.', 'success');
      } else {
        await apiPost('/products', body);
        showAlert('Product added successfully.', 'success');
      }
      closeModal();
      await loadProducts();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?\n\nManagers will submit an approval request. Owners will delete immediately.`)) return;
    try {
      const res = await apiDelete(`/products/${product._id}`);
      if (res.approval) {
        showAlert('Deletion request submitted for owner approval.', 'warning');
      } else {
        showAlert(`"${product.name}" deleted successfully.`, 'success');
      }
      await loadProducts();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      <div className="metrics-grid metrics-grid--four">
        <Card title="Total Products" value={products.length} tone="tone-indigo" />
        <Card title="Low Stock" value={lowCount} tone="tone-amber" />
        <Card title="Inventory Value" value={fmt(totalValue)} tone="tone-blue" />
        <Card title="Potential Profit" value={fmt(totalProfit)} tone="tone-emerald" />
      </div>

      <div className="panel panel-body toolbar-panel">
        <div className="toolbar-filters">
          <div className="search-field search-field--grow">
            <FiSearch className="search-field-icon" size={15} />
            <input className="form-control has-icon" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-control toolbar-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        {isManager && (
          <button onClick={() => openModal()} className="btn btn-primary">
            <FiPlus size={15} /> Add Product
          </button>
        )}
      </div>

      <div className="panel">
        {loading ? (
          <LoadingSpinner text="Loading products..." />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>SKU</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Profit</th>
                  <th>Qty</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  {isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isManager ? 10 : 9} className="table-empty">No products found</td>
                  </tr>
                ) : (
                  filtered.map((product) => {
                    const isLow = product.quantity <= product.threshold;
                    const profit = product.sellingPrice - product.costPrice;
                    return (
                      <tr key={product._id} className={isLow ? 'table-row-highlight' : ''}>
                        <td className="table-cell-primary">{product.name}</td>
                        <td><span className="badge badge-gray">{product.category}</span></td>
                        <td className="mono-xs text-subtle">{product.sku || '—'}</td>
                        <td>{fmt(product.costPrice)}</td>
                        <td>{fmt(product.sellingPrice)}</td>
                        <td className="table-cell-primary text-success">{fmt(profit)}</td>
                        <td className={`inventory-qty${isLow ? ' is-low' : ''}`}>{product.quantity}</td>
                        <td className="text-muted">{product.threshold}</td>
                        <td>
                          {product.quantity === 0
                            ? <span className="badge badge-danger">Out of Stock</span>
                            : isLow
                              ? <span className="badge badge-warning">Low Stock</span>
                              : <span className="badge badge-success">In Stock</span>
                          }
                        </td>
                        {isManager && (
                          <td>
                            <div className="table-actions">
                              <button onClick={() => openModal(product)} className="btn btn-outline btn-sm">
                                <FiEdit2 size={12} />
                              </button>
                              <button onClick={() => handleDelete(product)} className="btn btn-danger btn-sm">
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={handleSubmit} className="stack-lg">
          <div className="form-grid form-grid--two">
            <div className="form-grid-span-2">
              <label className="form-label">Product Name *</label>
              <input name="name" className="form-control" required value={form.name} onChange={handleFormChange} />
            </div>
            <div>
              <label className="form-label">Category *</label>
              <input name="category" className="form-control" required value={form.category} onChange={handleFormChange} list="category-list" />
              <datalist id="category-list">
                {categories.map((category) => <option key={category} value={category} />)}
              </datalist>
            </div>
            <div>
              <label className="form-label">SKU</label>
              <input name="sku" className="form-control" value={form.sku} onChange={handleFormChange} placeholder="Auto-generated if empty" />
            </div>
            <div>
              <label className="form-label">Cost Price *</label>
              <input name="costPrice" type="number" step="0.01" min="0" className="form-control" required value={form.costPrice} onChange={handleFormChange} />
            </div>
            <div>
              <label className="form-label">Selling Price *</label>
              <input name="sellingPrice" type="number" step="0.01" min="0" className="form-control" required value={form.sellingPrice} onChange={handleFormChange} />
            </div>
            <div>
              <label className="form-label">Quantity *</label>
              <input name="quantity" type="number" min="0" className="form-control" required value={form.quantity} onChange={handleFormChange} />
            </div>
            <div>
              <label className="form-label">Low Stock Threshold</label>
              <input name="threshold" type="number" min="0" className="form-control" value={form.threshold} onChange={handleFormChange} />
            </div>
            <div className="form-grid-span-2">
              <label className="form-label">Barcode</label>
              <div className="inline-actions">
                <input
                  name="barcode"
                  className="form-control"
                  value={form.barcode}
                  onChange={handleFormChange}
                  placeholder="Scan, type or generate"
                />
                <button type="button" onClick={generateBarcode} className="btn btn-outline btn-sm">
                  <FiBarChart2 size={13} /> Generate
                </button>
                <button type="button" onClick={downloadBarcode} className="btn btn-outline btn-sm">
                  <FiDownload size={13} />
                </button>
              </div>
              {form.barcode && (
                <div className="barcode-preview">
                  <svg ref={svgRef} />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer-actions">
            <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <span className="loading-spinner size-sm inline-light" />}
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
