import { useState, useEffect, useCallback } from 'react';
import { FiMapPin, FiPlus, FiEdit2, FiTrash2, FiUser, FiUsers } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/axios.js';

const EMPTY_FORM = { name: '', code: '', address: '', phone: '', email: '' };

export default function OwnerStores() {
  const [stores, setStores] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [editStore, setEditStore] = useState(null);
  const [managerStore, setManagerStore] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, type = 'error') => setAlert({ message, type });
  const clearAlert = () => setAlert(null);

  const loadStores = useCallback(async () => {
    try {
      const data = await apiGet('/stores');
      setStores(Array.isArray(data) ? data : []);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadManagers = useCallback(async () => {
    try {
      const data = await apiGet('/employees');
      const list = Array.isArray(data) ? data : (data.data || []);
      setManagers(list.filter((user) => user.role === 'manager'));
    } catch {
      setManagers([]);
    }
  }, []);

  useEffect(() => {
    loadStores();
    loadManagers();
  }, [loadStores, loadManagers]);

  const openCreate = () => {
    setEditStore(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (store) => {
    setEditStore(store);
    setForm({
      name: store.name,
      code: store.code,
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
    });
    setShowModal(true);
  };

  const openManagerModal = (store) => {
    setManagerStore(store);
    setSelectedManagerId(store.managerId?._id || '');
    setShowManagerModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editStore) {
        await apiPut(`/stores/${editStore._id}`, form);
        showAlert('Store updated successfully', 'success');
      } else {
        await apiPost('/stores', form);
        showAlert('Store created successfully', 'success');
      }
      setShowModal(false);
      await loadStores();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (store) => {
    if (!window.confirm(`Deactivate store "${store.name}"?`)) return;
    try {
      await apiDelete(`/stores/${store._id}`);
      showAlert('Store deactivated', 'success');
      await loadStores();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    }
  };

  const handleAssignManager = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPut(`/stores/${managerStore._id}/manager`, { managerId: selectedManagerId || null });
      showAlert('Manager assigned successfully', 'success');
      setShowManagerModal(false);
      await loadStores();
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Stores</h2>
          <p className="page-subtitle">Manage all store locations</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <FiPlus size={15} /> New Store
        </button>
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      {loading ? (
        <LoadingSpinner />
      ) : stores.length === 0 ? (
        <div className="panel empty-state owner-stores-empty">
          <FiMapPin size={40} className="empty-state-icon" />
          <p>No stores yet. Create your first store.</p>
        </div>
      ) : (
        <div className="owner-stores-grid">
          {stores.map((store) => (
            <div key={store._id} className="panel panel-body owner-store-card">
              <div className="owner-store-card-head">
                <div>
                  <h3 className="owner-store-name">{store.name}</h3>
                  <span className="badge badge-info">{store.code}</span>
                </div>
                <span className={`badge ${store.status === 'inactive' ? 'badge-danger' : 'badge-success'}`}>
                  {store.status || 'active'}
                </span>
              </div>

              {store.address && <p className="owner-store-meta">{store.address}</p>}
              {store.phone && <p className="owner-store-meta">{store.phone}</p>}
              {store.email && <p className="owner-store-meta owner-store-meta--spaced">{store.email}</p>}

              <div className="owner-store-manager">
                <FiUser size={12} />
                {store.managerId ? (
                  <span>{store.managerId.name}</span>
                ) : (
                  <span className="owner-store-manager-empty">No manager assigned</span>
                )}
              </div>

              <div className="owner-store-actions">
                <button onClick={() => openEdit(store)} className="btn btn-outline btn-sm">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => openManagerModal(store)} className="btn btn-outline btn-sm">
                  <FiUsers size={12} /> Manager
                </button>
                <button onClick={() => handleDelete(store)} className="btn btn-danger btn-sm">
                  <FiTrash2 size={12} /> Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editStore ? 'Edit Store' : 'New Store'}>
        <form onSubmit={handleSave} className="stack-lg">
          <div>
            <label className="form-label">Store Name *</label>
            <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Store Code *</label>
            <input
              className="form-control"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. MAIN, NYC01"
              required
              disabled={!!editStore}
            />
          </div>
          <div>
            <label className="form-label">Address</label>
            <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-grid form-grid--two form-grid--compact">
            <div>
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer-actions modal-footer-actions--soft">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : editStore ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showManagerModal} onClose={() => setShowManagerModal(false)} title="Assign Manager">
        <form onSubmit={handleAssignManager} className="stack-lg">
          <p className="modal-support-copy">Assign a manager to <strong>{managerStore?.name}</strong></p>
          <div>
            <label className="form-label">Manager</label>
            <select className="form-control" value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)}>
              <option value="">-- No Manager --</option>
              {managers.map((manager) => (
                <option key={manager._id} value={manager._id}>{manager.name} ({manager.email})</option>
              ))}
            </select>
          </div>
          <div className="modal-footer-actions modal-footer-actions--soft">
            <button type="button" onClick={() => setShowManagerModal(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : 'Assign'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
