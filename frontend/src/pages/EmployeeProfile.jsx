import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { RoleBadge } from '../components/ui/Badge.jsx';
import { apiGet } from '../api/axios.js';
import { fmtDate } from '../utils/helpers.js';
import '../styles/employee-profile.css';

const STATUS_BADGE = {
  approved: 'badge-success',
  pending: 'badge-warning',
  rejected: 'badge-danger',
  suspended: 'badge-danger',
  deactivated: 'badge-gray',
};

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'error') => setAlert({ message, type });

  useEffect(() => {
    apiGet(`/employees/${id}`)
      .then((data) => setEmployee(data.data || data))
      .catch((err) => showAlert(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <DashboardLayout>
      <button type="button" onClick={() => navigate(-1)} className="btn btn-outline btn-sm">
        <FiArrowLeft size={14} /> Back
      </button>

      {alert && <Alert message={alert.message} type={alert.type} />}

      <div className="stack-lg employee-profile-section">
        {loading ? (
          <LoadingSpinner />
        ) : !employee ? (
          <p className="text-muted">Employee not found.</p>
        ) : (
          <div className="panel panel-body employee-profile-card">
            <div className="employee-profile-header">
              <div className="employee-profile-avatar">
                {employee.name?.[0]?.toUpperCase() || <FiUser size={24} />}
              </div>
              <div>
                <h2 className="employee-profile-name">{employee.name}</h2>
                <p className="employee-profile-email">{employee.email}</p>
              </div>
            </div>

            <div className="employee-profile-list">
              <div className="employee-profile-row">
                <span className="employee-profile-label">Role</span>
                <RoleBadge role={employee.role} />
              </div>
              <div className="employee-profile-row">
                <span className="employee-profile-label">Status</span>
                <span className={`badge ${STATUS_BADGE[employee.status] || 'badge-gray'}`}>{employee.status}</span>
              </div>
              <div className="employee-profile-row">
                <span className="employee-profile-label">Store</span>
                <span className="employee-profile-value">{employee.storeId ? `${employee.storeId.name} (${employee.storeId.code})` : '-'}</span>
              </div>
              <div className="employee-profile-row">
                <span className="employee-profile-label">Joined</span>
                <span className="employee-profile-value">{fmtDate(employee.createdAt)}</span>
              </div>
              {employee.lastLogin && (
                <div className="employee-profile-row">
                  <span className="employee-profile-label">Last Login</span>
                  <span className="employee-profile-value">{fmtDate(employee.lastLogin)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
