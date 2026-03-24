import { useState, useEffect, useCallback } from 'react';
import { FiSend, FiInbox, FiMessageSquare, FiRefreshCw } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPost, apiPatch } from '../api/axios.js';
import { fmtDate } from '../utils/helpers.js';
import '../styles/support-messages.css';

export default function SupportMessages() {
  const [tab, setTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [compose, setCompose] = useState({ subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const showAlert = (msg, type = 'error') => setAlert({ message: msg, type });
  const clearAlert = () => setAlert(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const [inboxData, sentData] = await Promise.all([apiGet('/messages/inbox'), apiGet('/messages/sent')]);
      setInbox(inboxData.data || []);
      setSent(sentData.data || []);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!compose.subject.trim() || !compose.body.trim()) {
      showAlert('Subject and message body are required.');
      return;
    }
    setSending(true);
    try {
      await apiPost('/messages', { subject: compose.subject, body: compose.body, parentMessageId: replyTo?._id || undefined });
      showAlert('Message sent successfully.', 'success');
      setCompose({ subject: '', body: '' });
      setReplyTo(null);
      await loadMessages();
      setTab('sent');
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  const markRead = async (id) => {
    try {
      await apiPatch(`/messages/${id}/read`);
      setInbox((prev) => prev.map((message) => (message._id === id ? { ...message, read: true } : message)));
    } catch {}
  };

  const handleReply = (message) => {
    setReplyTo(message);
    setCompose({ subject: `Re: ${message.subject}`, body: '' });
    setTab('compose');
  };

  const unreadCount = inbox.filter((message) => !message.read).length;
  const tabs = [
    { key: 'inbox', label: `Inbox${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: <FiInbox size={14} /> },
    { key: 'sent', label: 'Sent', icon: <FiSend size={14} /> },
    { key: 'compose', label: 'New Message', icon: <FiMessageSquare size={14} /> },
  ];

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h2 className="page-title">Help &amp; Support</h2>
          <p className="page-subtitle">Contact the platform team for assistance</p>
        </div>
        <button onClick={loadMessages} className="btn btn-outline btn-sm" title="Refresh">
          <FiRefreshCw size={13} />
        </button>
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} />}

      <div className="support-tabs">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); if (key === 'compose' && !replyTo) setCompose({ subject: '', body: '' }); }}
            className={`support-tab${tab === key ? ' is-active' : ''}`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {loading && tab !== 'compose' ? (
        <LoadingSpinner />
      ) : (
        <>
          {tab === 'inbox' && (
            inbox.length === 0 ? (
              <div className="panel empty-state support-empty">
                <FiInbox size={40} className="empty-state-icon" />
                <p>No messages in your inbox.</p>
              </div>
            ) : (
              <div className="support-message-list">
                {inbox.map((message) => (
                  <div key={message._id} className={`panel panel-body support-message-card${!message.read ? ' is-unread' : ''}`} onClick={() => markRead(message._id)}>
                    <div className="support-message-row">
                      <div className="support-message-main">
                        <div className="support-message-title-row">
                          {!message.read && <span className="support-message-dot" />}
                          <p className="support-message-title">{message.subject}</p>
                        </div>
                        <p className="support-message-meta">From: {message.fromId?.name || 'Support Team'} · {fmtDate(message.sentAt)}</p>
                        <p className="support-message-body">{message.body}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleReply(message); }} className="btn btn-outline btn-sm">Reply</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'sent' && (
            sent.length === 0 ? (
              <div className="panel empty-state support-empty">
                <FiSend size={40} className="empty-state-icon" />
                <p>No sent messages yet.</p>
              </div>
            ) : (
              <div className="support-message-list">
                {sent.map((message) => (
                  <div key={message._id} className="panel panel-body">
                    <p className="support-message-title">{message.subject}</p>
                    <p className="support-message-meta">To: {message.toId?.name || 'Support Team'} · {fmtDate(message.sentAt)}</p>
                    <p className="support-message-body">{message.body}</p>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'compose' && (
            <div className="panel panel-body support-compose-panel">
              {replyTo && (
                <div className="support-reply-banner">
                  <span><strong>Replying to:</strong> {replyTo.subject}</span>
                  <button onClick={() => { setReplyTo(null); setCompose({ subject: '', body: '' }); }} className="support-reply-close">×</button>
                </div>
              )}
              <form onSubmit={handleSend} className="stack-lg">
                <div>
                  <label className="form-label">Subject *</label>
                  <input className="form-control" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Brief description of your issue" required />
                </div>
                <div>
                  <label className="form-label">Message *</label>
                  <textarea className="form-control support-compose-input" rows={6} value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} placeholder="Describe your issue in detail..." required />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    <FiSend size={14} /> {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
