import { useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';

const ICONS = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

export default function Alert({ message, type = 'error', onClose, autoClose = 5000, className = '' }) {
  const Icon = ICONS[type] || FiInfo;

  useEffect(() => {
    if (!message || !autoClose) return;
    const t = setTimeout(() => onClose?.(), autoClose);
    return () => clearTimeout(t);
  }, [message, autoClose, onClose]);

  if (!message) return null;

  return (
    <div className={`alert alert-${type} ${className}`.trim()}>
      <Icon className="alert-icon" size={16} />
      <span className="alert-message">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="alert-close" aria-label="Close alert">
          <FiX size={14} />
        </button>
      )}
    </div>
  );
}
