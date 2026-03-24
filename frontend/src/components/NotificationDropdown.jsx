import { useState, useEffect, useRef, useCallback } from 'react';
import { FiBell } from 'react-icons/fi';
import { apiGet, apiPut } from '../api/axios.js';
import { fmtDate } from '../utils/helpers.js';

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiGet('/notifications');
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await apiPut(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // non-blocking
    }
  };

  const markAllRead = async () => {
    try {
      await apiPut('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // non-blocking
    }
  };

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="dropdown-trigger"
        aria-label="Notifications"
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="dropdown-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="dropdown-panel">
          <div className="dropdown-panel-header">
            <span className="dropdown-panel-title">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="dropdown-panel-link">
                Mark all read
              </button>
            )}
          </div>

          <div className="dropdown-list">
            {notifications.length === 0 ? (
              <p className="dropdown-empty">No notifications</p>
            ) : (
              notifications.map((n) => (
                <button
                  type="button"
                  key={n._id}
                  onClick={() => !n.read && markRead(n._id)}
                  className={`dropdown-item${!n.read ? ' is-unread' : ''}`}
                >
                  <div className="dropdown-item-row">
                    {!n.read && <span className="dropdown-item-dot" />}
                    <div className={`dropdown-item-content${n.read ? ' is-read' : ''}`}>
                      <p className="dropdown-item-title">{n.title}</p>
                      <p className="dropdown-item-message">{n.message}</p>
                      <p className="dropdown-item-time">{fmtDate(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
