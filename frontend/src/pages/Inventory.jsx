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
  const { user, checkRole } = useAuthStore();
  const isManager = checkRole('owner', 'manager');
  const isOwner = checkRole('owner');

  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
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

  const loadInventory = useCallback(async () => {
    try {
      const params = isOwner && selectedStoreId ? { storeId: selectedStoreId } : {};
      const raw = await apiGet('/inventory', params);
      setInventoryRecords(Array.isArray(raw) ? raw : (raw.data || []));
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [isOwner, selectedStoreId]);

  useEffect(() => {
    if (isOwner) {
      apiGet('/stores').then((data) => setStores(Array.isArray(data) ? data : (data.data || []))).catch(() => {});
    }
  }, [isOwner]);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const filtered = inventoryRecords.filter((rec) => {
    const name = rec.productId?.name || '';
    const category = rec.productId?.category || '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      category.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(inventoryRecords.map((rec) => rec.productId?.category).filter(Boolean))].sort();

  // Summary cards
  const totalValue = inventoryRecords.reduce((s, rec) => s + (rec.productId?.costPrice || 0) * rec.quantity, 0);
  const totalProfit = inventoryRecords.reduce((s, rec) => s + ((rec.productId?.sellingPrice || 0) - (rec.productId?.costPrice || 0)) * rec.quantity, 0);
  const lowCount = inventoryRecords.filter((rec) => rec.quantity <= rec.threshold).length;

  const openModal = (rec = null) => {
    const product = rec?.productId;
    setEditingId(product?._id || null);
    setForm(product ? {
      name: product.name || '',
      category: product.category || '',
      costPrice: product.costPrice ?? '',
      sellingPrice: product.sellingPrice ?? '',
      quantity: rec.quantity ?? '',
      threshold: rec.threshold ?? 10,
      sku: product.sku || '',
      barcode: product.barcode || '',
      barcodeType: product.barcodeType || 'CODE128',
    } : EMPTY_FORM);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingId(null); };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Barcode rendering
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
      for (let i = 0; i < 6; i++) sku += chars[Math.floor(Math.random() * chars.length)];
    }
    setForm((f) => ({ ...f, sku, barcode: sku }));
  };

  const downloadBarcode = () => {
    if (!svgRef.current || !svgRef.current.innerHTML) return showAlert('Generate a barcode first.', 'warning');
    const svgStr = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.sku || 'barcode'}.svg`;
    a.click();
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
      quantity: parseInt(form.quantity),
      threshold: parseInt(form.threshold) || 10,
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      barcodeType: 'CODE128',
      storeId: isOwner ? (selectedStoreId || undefined) : (user?.storeId || undefined),
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
      await loadInventory();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rec) => {
    const product = rec.productId;
    if (!product?._id) return;
    if (!confirm(`Delete "${product.name}"?\n\nManagers will submit an approval request. Owners will delete immediately.`)) return;
    try {
      const res = await apiDelete(`/products/${product._id}`);
      if (res.approval) {
        showAlert('Deletion request submitted for owner approval.', 'warning');
      } else {
        showAlert(`"${product.name}" deleted successfully.`, 'success');
      }
      await loadInventory();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Card title="Total Products" value={inventoryRecords.length} colorClass="text-indigo-600" bgClass="bg-indigo-50" />
        <Card title="Low Stock" value={lowCount} colorClass="text-amber-600" bgClass="bg-amber-50" />
        <Card title="Inventory Value" value={fmt(totalValue)} colorClass="text-blue-600" bgClass="bg-blue-50" />
        <Card title="Potential Profit" value={fmt(totalProfit)} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
      </div>

      {/* Toolbar */}
      <div className="card p-4 mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              className="form-control pl-9"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-control w-44"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {isOwner && stores.length > 0 && (
            <select
              className="form-control w-44"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
            >
              <option value="">All Stores</option>
              {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          )}
        </div>
        {isManager && (
          <button onClick={() => openModal()} className="btn btn-primary shrink-0">
            <FiPlus size={15} /> Add Product
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading inventory..." />
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
                  {isOwner && <th>Store</th>}
                  <th>Qty</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  {isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isManager ? (isOwner ? 11 : 10) : (isOwner ? 10 : 9)} className="text-center py-12 text-slate-400">
                      No inventory records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((rec) => {
                    const p = rec.productId || {};
                    const isLow = rec.quantity <= rec.threshold;
                    const profit = (p.sellingPrice || 0) - (p.costPrice || 0);
                    return (
                      <tr key={rec._id} className={isLow ? 'bg-amber-50/50' : ''}>
                        <td className="font-medium text-slate-800">{p.name || '—'}</td>
                        <td><span className="badge badge-gray">{p.category || '—'}</span></td>
                        <td className="font-mono text-xs text-slate-400">{p.sku || '—'}</td>
                        <td>{fmt(p.costPrice)}</td>
                        <td>{fmt(p.sellingPrice)}</td>
                        <td className="text-emerald-600 font-semibold">{fmt(profit)}</td>
                        {isOwner && (
                          <td className="text-slate-500 text-sm">{rec.storeId?.name || '—'}</td>
                        )}
                        <td className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>{rec.quantity}</td>
                        <td className="text-slate-400">{rec.threshold}</td>
                        <td>
                          {rec.quantity === 0
                            ? <span className="badge badge-danger">Out of Stock</span>
                            : isLow
                              ? <span className="badge badge-warning">Low Stock</span>
                              : <span className="badge badge-success">In Stock</span>
                          }
                        </td>
                        {isManager && (
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openModal(rec)}
                                className="btn btn-outline btn-sm"
                              >
                                <FiEdit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete(rec)}
                                className="btn btn-danger btn-sm"
                              >
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

      {/* Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Product Name *</label>
              <input name="name" className="form-control" required value={form.name} onChange={handleFormChange} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="form-label">Category *</label>
              <input name="category" className="form-control" required value={form.category} onChange={handleFormChange} list="category-list" />
              <datalist id="category-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="col-span-2 sm:col-span-1">
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

            {/* Barcode */}
            <div className="col-span-2">
              <label className="form-label">Barcode</label>
              <div className="flex gap-2">
                <input
                  name="barcode"
                  className="form-control flex-1"
                  value={form.barcode}
                  onChange={handleFormChange}
                  placeholder="Scan, type or generate"
                />
                <button type="button" onClick={generateBarcode} className="btn btn-outline btn-sm shrink-0">
                  <FiBarChart2 size={13} /> Generate
                </button>
                <button type="button" onClick={downloadBarcode} className="btn btn-outline btn-sm shrink-0">
                  <FiDownload size={13} />
                </button>
              </div>
              {form.barcode && (
                <div className="mt-3 flex justify-center p-3 bg-slate-50 rounded-lg">
                  <svg ref={svgRef} />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
