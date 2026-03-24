import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiRotateCcw } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPost } from '../api/axios.js';
import { fmt, fmtDate } from '../utils/helpers.js';

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [saleIdInput, setSaleIdInput] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('defective');
  const [refundAmount, setRefundAmount] = useState('');

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadReturns = useCallback(async () => {
    try {
      const data = await apiGet('/returns');
      setReturns(data);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  useEffect(() => {
    if (!selectedSale || !returnProductId) return;
    const item = selectedSale.items.find((entry) => entry.productId === returnProductId || entry.productId?._id === returnProductId);
    if (item) {
      setRefundAmount((item.price * returnQty).toFixed(2));
    }
  }, [returnProductId, returnQty, selectedSale]);

  const lookupSale = async () => {
    const id = saleIdInput.trim();
    if (!id) return showAlert('Enter a Sale ID to look up.', 'warning');
    setLookingUp(true);
    try {
      const sales = await apiGet('/sales');
      const found = sales.find((sale) => sale._id === id || sale._id.slice(-8).toUpperCase() === id.toUpperCase());
      if (!found) return showAlert('Sale not found. Check the ID and try again.');
      setSelectedSale(found);
      if (found.items?.length) {
        const firstItem = found.items[0];
        setReturnProductId(firstItem.productId?._id || firstItem.productId || '');
        setReturnQty(1);
      }
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLookingUp(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSale) return showAlert('Look up a sale first.');
    setSubmitting(true);
    try {
      await apiPost('/returns', {
        saleId: selectedSale._id,
        productId: returnProductId,
        quantity: returnQty,
        reason: returnReason,
        refundAmount: parseFloat(refundAmount),
      });
      showAlert('Return processed successfully. Stock has been restocked.', 'success');
      setSelectedSale(null);
      setSaleIdInput('');
      setReturnProductId('');
      setReturnQty(1);
      setRefundAmount('');
      await loadReturns();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      <div className="returns-layout">
        <div className="panel panel-body">
          <h2 className="returns-panel-title"><FiRotateCcw size={16} /> Process Return</h2>

          <div className="returns-lookup">
            <label className="form-label">Sale ID</label>
            <div className="inline-actions">
              <input
                className="form-control"
                placeholder="Full ID or last 8 chars"
                value={saleIdInput}
                onChange={(e) => setSaleIdInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupSale(); } }}
              />
              <button onClick={lookupSale} disabled={lookingUp} className="btn btn-outline">
                <FiSearch size={14} />
                {lookingUp ? '...' : 'Lookup'}
              </button>
            </div>
          </div>

          {selectedSale && (
            <div className="returns-sale-banner">
              <strong>Sale #{selectedSale._id.slice(-8).toUpperCase()}</strong> - {selectedSale.customerName || 'Walk-in'} - {fmt(selectedSale.totalAmount)} ({selectedSale.paymentMethod})
            </div>
          )}

          <form onSubmit={handleReturnSubmit} className="stack-lg">
            <div>
              <label className="form-label">Product</label>
              <select className="form-control" value={returnProductId} onChange={(e) => setReturnProductId(e.target.value)} disabled={!selectedSale} required>
                {!selectedSale ? (
                  <option value="">-- Look up sale first --</option>
                ) : (
                  selectedSale.items.map((item) => {
                    const pid = item.productId?._id || item.productId;
                    return <option key={pid} value={pid}>{item.name} ({item.qty} x {fmt(item.price)})</option>;
                  })
                )}
              </select>
            </div>

            <div>
              <label className="form-label">Quantity</label>
              <input type="number" min="1" className="form-control" value={returnQty} onChange={(e) => setReturnQty(parseInt(e.target.value, 10) || 1)} required />
            </div>

            <div>
              <label className="form-label">Reason</label>
              <select className="form-control" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} required>
                <option value="defective">Defective</option>
                <option value="wrong_item">Wrong Item</option>
                <option value="not_needed">Not Needed</option>
                <option value="damaged">Damaged</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">Refund Amount</label>
              <input type="number" step="0.01" min="0" className="form-control" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} required />
            </div>

            <button type="submit" disabled={submitting || !selectedSale} className="btn btn-primary btn-block">
              {submitting && <span className="loading-spinner size-sm inline-light" />}
              {submitting ? 'Processing...' : 'Process Return'}
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Returns History</h2>
          </div>
          {loading ? (
            <LoadingSpinner text="Loading returns..." />
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Return ID</th>
                    <th>Sale ID</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Reason</th>
                    <th>Refund</th>
                    <th>Processed By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-empty">No returns recorded</td>
                    </tr>
                  ) : (
                    returns.map((item) => (
                      <tr key={item._id}>
                        <td className="mono-xs text-subtle">#{item._id.slice(-8).toUpperCase()}</td>
                        <td className="mono-xs text-subtle">#{(item.saleId?._id || item.saleId || '').toString().slice(-8).toUpperCase()}</td>
                        <td className="table-cell-primary">{item.productId?.name || 'N/A'}</td>
                        <td>{item.quantity}</td>
                        <td><span className="badge badge-warning">{item.reason}</span></td>
                        <td className="table-cell-primary text-danger">{fmt(item.refundAmount)}</td>
                        <td>{item.processedBy?.name || 'N/A'}</td>
                        <td className="table-note">{fmtDate(item.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
