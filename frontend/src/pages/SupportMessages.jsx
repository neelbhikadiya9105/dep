import { useState, useEffect, useCallback } from 'react';
import { FiSend, FiInbox, FiMessageSquare, FiRefreshCw } from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import Alert from '../components/ui/Alert.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { apiGet, apiPost, apiPatch } from '../api/axios.js';
import { fmtDate } from '../utils/helpers.js';

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
      const [inboxData, sentData] = await Promise.all([
        apiGet('/messages/inbox'),
        apiGet('/messages/sent'),
      ]);
      setInbox(inboxData.data || []);
      setSent(sentData.data || []);
    } catch (err) {
      showAlert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!compose.subject.trim() || !compose.body.trim()) {
      showAlert('Subject and message body are required.');
      return;
    }
    setSending(true);
    try {
      await apiPost('/messages', {
        subject: compose.subject,
        body: compose.body,
        parentMessageId: replyTo?._id || undefined,
      });
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
      setInbox((prev) => prev.map((m) => m._id === id ? { ...m, read: true } : m));
    } catch { /* non-critical */ }
  };

  const handleReply = (msg) => {
    setReplyTo(msg);
    setCompose({ subject: `Re: ${msg.subject}`, body: '' });
    setTab('compose');
  };

  const unreadCount = inbox.filter((m) => !m.read).length;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Help &amp; Support</h2>
          <p className="text-sm text-slate-500">Contact the platform team for assistance</p>
        </div>
        <button onClick={loadMessages} className="btn btn-outline btn-sm" title="Refresh">
          <FiRefreshCw size={13} />
        </button>
      </div>

      {alert && <Alert message={alert.message} type={alert.type} onClose={clearAlert} className="mb-4" />}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-100">
        {[
          { key: 'inbox', label: `Inbox${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: <FiInbox size={14} /> },
          { key: 'sent', label: 'Sent', icon: <FiSend size={14} /> },
          { key: 'compose', label: 'New Message', icon: <FiMessageSquare size={14} /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); if (key === 'compose' && !replyTo) setCompose({ subject: '', body: '' }); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {loading && tab !== 'compose' ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Inbox */}
          {tab === 'inbox' && (
            inbox.length === 0 ? (
              <div className="card p-12 text-center">
                <FiInbox size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No messages in your inbox.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {inbox.map((msg) => (
                  <div
                    key={msg._id}
                    className={`card p-4 cursor-pointer transition-all hover:shadow-md ${!msg.read ? 'border-l-4 border-l-indigo-500' : ''}`}
                    onClick={() => markRead(msg._id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!msg.read && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                          <p className={`text-sm font-semibold text-slate-800 truncate ${!msg.read ? '' : 'font-medium'}`}>
                            {msg.subject}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                          From: {msg.fromId?.name || 'Support Team'} · {fmtDate(msg.sentAt)}
                        </p>
                        <p className="text-sm text-slate-600 line-clamp-2">{msg.body}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReply(msg); }}
                        className="btn btn-outline btn-sm shrink-0"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Sent */}
          {tab === 'sent' && (
            sent.length === 0 ? (
              <div className="card p-12 text-center">
                <FiSend size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No sent messages yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sent.map((msg) => (
                  <div key={msg._id} className="card p-4">
                    <p className="text-sm font-semibold text-slate-800 mb-1">{msg.subject}</p>
                    <p className="text-xs text-slate-500 mb-2">
                      To: {msg.toId?.name || 'Support Team'} · {fmtDate(msg.sentAt)}
                    </p>
                    <p className="text-sm text-slate-600 line-clamp-2">{msg.body}</p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Compose */}
          {tab === 'compose' && (
            <div className="card p-6 max-w-2xl">
              {replyTo && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
                  <span className="font-medium">Replying to:</span> {replyTo.subject}
                  <button
                    onClick={() => { setReplyTo(null); setCompose({ subject: '', body: '' }); }}
                    className="ml-2 text-slate-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex flex-col gap-4">
                <div>
                  <label className="form-label">Subject *</label>
                  <input
                    className="form-control"
                    value={compose.subject}
                    onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Message *</label>
                  <textarea
                    className="form-control"
                    rows={6}
                    value={compose.body}
                    onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    required
                  />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    <FiSend size={14} />
                    {sending ? 'Sending...' : 'Send Message'}
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
