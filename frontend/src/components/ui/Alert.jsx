import { useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';

const ICONS = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

const STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export default function Alert({ message, type = 'error', onClose, autoClose = 5000 }) {
  const Icon = ICONS[type] || FiInfo;

  useEffect(() => {
    if (!message || !autoClose) return;
    const t = setTimeout(() => onClose?.(), autoClose);
    return () => clearTimeout(t);
  }, [message, autoClose, onClose]);

  if (!message) return null;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm mb-4 ${STYLES[type]}`}>
      <Icon className="shrink-0 mt-0.5" size={16} />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100">
          <FiX size={14} />
        </button>
      )}
    </div>
  );
}
