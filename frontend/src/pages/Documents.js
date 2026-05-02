import { useState, useEffect, useRef, useCallback } from "react";
import api from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./Documents.css";

// ── Icon ───────────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ── Expiry badge ────────────────────────────────────────────
function ExpiryBadge({ daysLeft, expiryDate }) {
  if (!expiryDate) return <span className="doc-badge doc-badge--grey">No expiry</span>;
  if (daysLeft < 0)   return <span className="doc-badge doc-badge--red">Expired</span>;
  if (daysLeft <= 30) return <span className="doc-badge doc-badge--red">{daysLeft}d left</span>;
  if (daysLeft <= 60) return <span className="doc-badge doc-badge--amber">{daysLeft}d left</span>;
  return <span className="doc-badge doc-badge--green">{daysLeft}d left</span>;
}

const DOC_META = {
  passport:    { label: "Passport",    color: "blue", icon: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zM9 12l2 2 4-4" },
  work_permit: { label: "Work Permit", color: "teal", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" },
  other:       { label: "Other",       color: "grey", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" },
};

// ── Preview Modal ───────────────────────────────────────────
function PreviewModal({ doc, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const isPdf = doc.file_name?.toLowerCase().endsWith('.pdf');
  const isImg = /\.(jpg|jpeg|png)$/i.test(doc.file_name || '');

  useEffect(() => {
    let url = null;
    const fetchFile = async () => {
      try {
        const res = await api.get(`/documents/${doc.id}/preview/`, { responseType: 'blob' });
        // res.data is already a Blob since we set responseType: 'blob'
        // Just use it directly to preserve the correct MIME type (e.g. application/pdf)
        url = URL.createObjectURL(res.data);
        setBlobUrl(url);
      } catch (err) {
        console.error("Preview failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFile();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [doc.id]);

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-preview-modal" onClick={e => e.stopPropagation()}>
        <div className="doc-modal-header">
          <div>
            <h3>{doc.label}</h3>
            <span className="doc-preview-filename">{doc.file_name}</span>
          </div>
          <button className="doc-modal-close" onClick={onClose}>
            <Icon d="M18 6 6 18M6 6l12 12" size={20} />
          </button>
        </div>
        <div className="doc-preview-body">
          {loading ? (
            <div className="doc-empty"><div className="doc-spin" /><p>Loading preview…</p></div>
          ) : blobUrl ? (
            <>
              {isPdf && <iframe src={blobUrl} title={doc.label} className="doc-preview-iframe" />}
              {isImg && <img src={blobUrl} alt={doc.label} className="doc-preview-img" />}
              {!isPdf && !isImg && (
                <div className="doc-empty">
                  <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" size={40} stroke="#9aa5b4" />
                  <p>Preview not available for this file type.</p>
                </div>
              )}
            </>
          ) : (
            <div className="doc-empty"><p>Failed to load preview. Please try downloading the file.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Upload Modal (multi-file + drag & drop) ─────────────────
function UploadModal({ empId, onClose, onSuccess }) {
  const [docType,  setDocType]  = useState('passport');
  const [label,    setLabel]    = useState('');
  const [expiry,   setExpiry]   = useState('');
  const [notes,    setNotes]    = useState('');
  const [files,    setFiles]    = useState([]);   // multiple files
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const addFiles = (newFiles) => {
    const allowed = Array.from(newFiles).filter(f =>
      /\.(pdf|jpg|jpeg|png)$/i.test(f.name)
    );
    setFiles(prev => [...prev, ...allowed].slice(0, 5)); // max 5
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (files.length === 0) return setError('Select at least one file.');
    setLoading(true); setError('');
    const results = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('doc_type', docType);
        fd.append('label', label || file.name);
        fd.append('expiry_date', expiry);
        fd.append('notes', notes);
        await api.post(`/documents/${empId}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        results.push({ name: file.name, ok: true });
      } catch (err) {
        results.push({ name: file.name, ok: false, error: err.response?.data?.error });
      }
    }
    setLoading(false);
    const failed = results.filter(r => !r.ok);
    if (failed.length === 0) {
      onSuccess(results.length);
    } else {
      setError(`${failed.length} file(s) failed: ${failed.map(f => f.name).join(', ')}`);
      if (results.some(r => r.ok)) onSuccess(results.filter(r => r.ok).length, true);
    }
  };

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={e => e.stopPropagation()}>
        <div className="doc-modal-header">
          <h3>Upload Documents</h3>
          <button className="doc-modal-close" onClick={onClose}>
            <Icon d="M18 6 6 18M6 6l12 12" />
          </button>
        </div>
        <div className="doc-modal-body">
          {error && <div className="doc-form-error">{error}</div>}

          <label className="doc-label">Document Type *</label>
          <select className="doc-input" value={docType} onChange={e => setDocType(e.target.value)}>
            <option value="passport">Passport</option>
            <option value="work_permit">Work Permit</option>
            <option value="other">Other</option>
          </select>

          <label className="doc-label">Label (optional)</label>
          <input className="doc-input" placeholder="e.g. Passport Renewal 2025"
            value={label} onChange={e => setLabel(e.target.value)} />

          <label className="doc-label">Expiry Date</label>
          <input className="doc-input" type="date" value={expiry}
            onChange={e => setExpiry(e.target.value)} />

          <label className="doc-label">Notes (optional)</label>
          <textarea className="doc-input doc-textarea" rows={2} placeholder="Any notes..."
            value={notes} onChange={e => setNotes(e.target.value)} />

          <label className="doc-label">Files * — PDF, JPG, PNG · max 10MB each · up to 5 files</label>
          <div
            className={`doc-file-drop${dragging ? ' dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple hidden
              onChange={e => addFiles(e.target.files)} />
            <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={24} stroke="#9aa5b4" />
            <span className="doc-file-hint">
              {dragging ? 'Drop files here' : 'Drag & drop or click to select'}
            </span>
          </div>

          {files.length > 0 && (
            <div className="doc-file-list">
              {files.map((f, i) => (
                <div key={i} className="doc-file-chip">
                  <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" size={13} />
                  <span>{f.name}</span>
                  <span className="doc-file-size">{(f.size / 1024).toFixed(0)} KB</span>
                  <button className="doc-file-remove" onClick={e => { e.stopPropagation(); removeFile(i); }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="doc-modal-footer">
          <button className="topbar-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="topbar-btn primary" onClick={handleSubmit} disabled={loading || files.length === 0}>
            {loading ? `Uploading ${files.length} file(s)…` : `Upload ${files.length || ''} File${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Employee Search Dropdown ────────────────────────────────
function EmpSearchBar({ onSelect, currentEmpId }) {
  const [query,    setQuery]    = useState(currentEmpId || '');
  const [results,  setResults]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);
  const [filter,   setFilter]   = useState('');
  const debounceRef = useRef();

  const search = useCallback(async (q, p = 1, fil = '') => {
    if (!q && !fil) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, page_size: 8 });
      if (q)   params.set('search', q);
      if (fil) params.set('status', fil);
      const res = await api.get(`/employees/?${params}`);
      const data = res.data.results || [];
      if (p === 1) setResults(data);
      else setResults(prev => [...prev, ...data]);
      setHasMore(!!res.data.next);
      setOpen(true);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); search(query, 1, filter); }, 300);
  }, [query, filter, search]);

  const handleSelect = (emp) => {
    setQuery(emp.emp_id);
    setOpen(false);
    onSelect(emp.emp_id, emp.name);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    search(query, next, filter);
  };

  return (
    <div className="doc-emp-search">
      <div className="doc-search-bar">
        <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0" size={16} stroke="#9aa5b4" />
        <input
          className="doc-search-input"
          placeholder="Search by Employee ID or Name…"
          value={query}
          onChange={e => { setQuery(e.target.value); }}
          onFocus={() => query && setOpen(true)}
        />
        <select className="doc-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {loading && <div className="doc-search-spin" />}
      </div>
      {open && results.length > 0 && (
        <div className="doc-emp-dropdown">
          {results.map(emp => (
            <div key={emp.emp_id} className="doc-emp-row" onClick={() => handleSelect(emp)}>
              <div className="doc-emp-avatar">{(emp.name || 'E').slice(0,2).toUpperCase()}</div>
              <div className="doc-emp-info">
                <span className="doc-emp-name">{emp.name}</span>
                <span className="doc-emp-meta">{emp.emp_id} · {emp.division} · {emp.designation || '—'}</span>
              </div>
              <span className={`doc-status-dot ${emp.status === 'Active' ? 'active' : 'inactive'}`} />
            </div>
          ))}
          {hasMore && (
            <button className="doc-load-more" onClick={loadMore} disabled={loading}>
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
      {open && !loading && results.length === 0 && query && (
        <div className="doc-emp-dropdown">
          <div className="doc-empty" style={{padding:'16px'}}>No employees found</div>
        </div>
      )}
    </div>
  );
}

// ── Audit Log Panel ────────────────────────────────────────
function AuditPanel({ empId }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empId) return;
    api.get(`/documents/audit/?emp_id=${empId}`)
      .then(r => setLogs(r.data.results || r.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [empId]);

  if (loading) return <div className="doc-empty" style={{padding:'24px'}}><div className="doc-spin" /><p>Loading audit log…</p></div>;
  if (logs.length === 0) return <div className="doc-empty" style={{padding:'24px'}}><p>No audit activity yet.</p></div>;

  return (
    <div className="doc-audit-list">
      {logs.map((l, i) => (
        <div key={i} className="doc-audit-row">
          <div className="doc-audit-dot" />
          <div className="doc-audit-body">
            <span className="doc-audit-msg">{l.message || `${l.action} by ${l.performed_by}`}</span>
            <span className="doc-audit-time">{l.timestamp ? new Date(l.timestamp).toLocaleString() : l.uploaded_at}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Notification Banner ─────────────────────────────────────
function NotificationBanner({ expiring }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || expiring.length === 0) return null;
  const critical = expiring.filter(d => d.days_left <= 7);
  const warning  = expiring.filter(d => d.days_left > 7 && d.days_left <= 30);

  return (
    <div className={`doc-notif-banner ${critical.length > 0 ? 'critical' : 'warning'}`}>
      <Icon
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
        size={18}
      />
      <div className="doc-notif-text">
        {critical.length > 0 && (
          <strong>{critical.length} document{critical.length > 1 ? 's' : ''} expiring within 7 days! </strong>
        )}
        {warning.length > 0 && (
          <span>{warning.length} document{warning.length > 1 ? 's' : ''} expiring within 30 days.</span>
        )}
        <span className="doc-notif-names">
          {expiring.slice(0,3).map(d => `${d.emp_name} (${d.doc_type_label})`).join(' · ')}
          {expiring.length > 3 && ` +${expiring.length - 3} more`}
        </span>
      </div>
      <button className="doc-notif-close" onClick={() => setDismissed(true)}>×</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function Documents() {
  const user    = JSON.parse(localStorage.getItem('user') || '{}');
  const isPriv  = user.role === 'admin' || user.role === 'hr';
  const ownId   = user.emp_id || null;

  const [empId,      setEmpId]      = useState(ownId || '');
  const [empName,    setEmpName]    = useState('');
  const [docs,       setDocs]       = useState([]);
  const [expiring,   setExpiring]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [tab,        setTab]        = useState('docs');
  const [toast,      setToast]      = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  // Auto-load employee's own docs
  useEffect(() => { if (ownId) loadDocs(ownId); }, [ownId]);
  useEffect(() => { if (isPriv) loadExpiring(); }, [isPriv]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDocs = async (id) => {
    if (!id) return;
    setLoading(true); setError('');
    try {
      const res = await api.get(`/documents/${id}/`);
      setDocs(res.data);
    } catch {
      setError('Employee not found or access denied.');
      setDocs([]);
    } finally { setLoading(false); }
  };

  const loadExpiring = async () => {
    try {
      const res = await api.get('/documents/expiring/');
      setExpiring(res.data);
    } catch {}
  };

  const handleSelect = (id, name) => {
    setEmpId(id);
    setEmpName(name);
    setError('');
    loadDocs(id);
  };

  const handleDelete = async (pk) => {
    if (!window.confirm('Delete this document permanently?')) return;
    setDeleting(pk);
    try {
      await api.delete(`/documents/${pk}/delete/`);
      setDocs(prev => prev.filter(d => d.id !== pk));
      loadExpiring();
      showToast('Document deleted.');
    } catch { showToast('Delete failed.', 'error'); }
    finally { setDeleting(null); }
  };

  const handleDownload = async (pk, fileName) => {
    try {
      const res = await api.get(`/documents/${pk}/download/`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${fileName}`);
    } catch { showToast('Download failed.', 'error'); }
  };

  // Filter docs by type
  const filtered = typeFilter === 'all'
    ? docs
    : docs.filter(d => d.doc_type === typeFilter);

  const grouped = {
    passport:    filtered.filter(d => d.doc_type === 'passport'),
    work_permit: filtered.filter(d => d.doc_type === 'work_permit'),
    other:       filtered.filter(d => d.doc_type === 'other'),
  };

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="dashboard-main">

        {/* Toast */}
        {toast && (
          <div className={`doc-toast doc-toast--${toast.type}`}>
            <Icon d={toast.type === 'success'
              ? "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
              : "M18 6 6 18M6 6l12 12"} size={15} />
            {toast.msg}
          </div>
        )}

        {/* Topbar */}
        <div className="dashboard-topbar">
          <div>
            <div className="topbar-title">Document Management</div>
            <div className="topbar-sub">
              {empId && empName ? `${empName} · ${empId}` : 'Passport · Work Permit · Supporting Files'}
            </div>
          </div>
          <div className="topbar-actions">
            {isPriv && empId && (
              <button className="topbar-btn primary" onClick={() => setShowUpload(true)}>
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={15} stroke="white" />
                Upload Documents
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-content">

          {/* Notification banner */}
          {isPriv && <NotificationBanner expiring={expiring} />}

          {/* Tabs */}
          {isPriv && (
            <div className="doc-tabs">
              {[
                { key: 'docs',     label: 'Employee Documents' },
                { key: 'expiring', label: 'Expiring Soon', count: expiring.length },
              ].map(t => (
                <button key={t.key} className={`doc-tab${tab === t.key ? ' active' : ''}`}
                  onClick={() => setTab(t.key)}>
                  {t.label}
                  {t.count > 0 && <span className="doc-tab-count">{t.count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* ── EXPIRING TAB ─────────────────────── */}
          {tab === 'expiring' && isPriv && (
            <div className="doc-section">
              <div className="doc-section-header">
                <span>Documents expiring within 60 days — click row to view employee</span>
              </div>
              {expiring.length === 0 ? (
                <div className="doc-empty">
                  <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" size={36} stroke="#9aa5b4" />
                  <p>No documents expiring soon</p>
                </div>
              ) : (
                <table className="doc-table">
                  <thead>
                    <tr><th>Employee</th><th>Division</th><th>Type</th><th>Label</th><th>Expiry</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {expiring.map(d => (
                      <tr key={d.id} className="doc-table-row--clickable"
                        onClick={() => { handleSelect(d.emp_id, d.emp_name); setTab('docs'); }}>
                        <td><strong>{d.emp_name}</strong><br /><span className="doc-sub">{d.emp_id}</span></td>
                        <td>{d.division}</td>
                        <td><span className={`doc-type-chip doc-type-chip--${DOC_META[d.doc_type]?.color || 'grey'}`}>{d.doc_type_label}</span></td>
                        <td>{d.label}</td>
                        <td>{d.expiry_date}</td>
                        <td><ExpiryBadge daysLeft={d.days_left} expiryDate={d.expiry_date} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── DOCS TAB ─────────────────────────── */}
          {tab === 'docs' && (
            <>
              {/* Employee search with live dropdown */}
              {isPriv && (
                <EmpSearchBar onSelect={handleSelect} currentEmpId={empId} />
              )}

              {!empId && isPriv && (
                <div className="doc-empty doc-empty--large">
                  <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0" size={44} stroke="#c8d0da" />
                  <p>Search for an employee to view their documents</p>
                </div>
              )}

              {error && <div className="doc-form-error">{error}</div>}

              {loading && (
                <div className="doc-empty">
                  <div className="doc-spin" /><p>Loading documents…</p>
                </div>
              )}

              {!loading && empId && !error && (
                <>
                  {/* Summary + type filter */}
                  <div className="doc-summary-bar">
                    {['all', 'passport', 'work_permit', 'other'].map(t => {
                      const count = t === 'all' ? docs.length : docs.filter(d => d.doc_type === t).length;
                      const meta  = t === 'all' ? null : DOC_META[t];
                      return (
                        <button key={t}
                          className={`doc-summary-chip doc-summary-chip--${meta?.color || 'all'}${typeFilter === t ? ' active' : ''}`}
                          onClick={() => setTypeFilter(t)}>
                          {meta && <Icon d={meta.icon} size={13} />}
                          {t === 'all' ? 'All' : meta.label} <strong>{count}</strong>
                        </button>
                      );
                    })}
                  </div>

                  {filtered.length === 0 ? (
                    <div className="doc-empty">
                      <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" size={36} stroke="#9aa5b4" />
                      <p>{docs.length === 0 ? 'No documents uploaded yet.' : 'No documents match the filter.'}</p>
                    </div>
                  ) : (
                    ['passport', 'work_permit', 'other'].map(type => {
                      const group = grouped[type];
                      if (group.length === 0) return null;
                      const meta = DOC_META[type];
                      return (
                        <div key={type} className="doc-section">
                          <div className="doc-section-header">
                            <div className="doc-section-title">
                              <span className={`doc-type-chip doc-type-chip--${meta.color}`}>
                                <Icon d={meta.icon} size={13} />{meta.label}
                              </span>
                              <span className="doc-count">{group.length} file{group.length > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="doc-cards">
                            {group.map(doc => (
                              <div key={doc.id} className="doc-card">
                                <div className={`doc-card-icon doc-card-icon--${meta.color}`}>
                                  <Icon d={meta.icon} size={22} />
                                </div>
                                <div className="doc-card-body">
                                  <div className="doc-card-title">{doc.label}</div>
                                  <div className="doc-card-meta">
                                    <span>{doc.file_name}</span>
                                    <span>·</span>
                                    <span>Uploaded {doc.uploaded_at}</span>
                                    <span>·</span>
                                    <span>by {doc.uploaded_by}</span>
                                  </div>
                                  {doc.expiry_date && (
                                    <div className="doc-card-expiry">
                                      <Icon d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" size={12} />
                                      Expires: {doc.expiry_date}
                                    </div>
                                  )}
                                  {doc.notes && <div className="doc-card-notes">📝 {doc.notes}</div>}
                                </div>
                                <div className="doc-card-right">
                                  <ExpiryBadge daysLeft={doc.days_left} expiryDate={doc.expiry_date} />
                                  <div className="doc-card-actions">
                                    <button className="doc-action-btn doc-action-btn--preview"
                                      onClick={() => setPreviewDoc(doc)} title="Preview">
                                      <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" size={14} />
                                      Preview
                                    </button>
                                    <button className="doc-action-btn doc-action-btn--download"
                                      onClick={() => handleDownload(doc.id, doc.file_name)} title="Download">
                                      <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" size={14} />
                                      Download
                                    </button>
                                    {isPriv && (
                                      <button className="doc-action-btn doc-action-btn--delete"
                                        onClick={() => handleDelete(doc.id)}
                                        disabled={deleting === doc.id} title="Delete">
                                        <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />
                                        {deleting === doc.id ? '…' : 'Delete'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Audit log */}
                  {isPriv && (
                    <div className="doc-section">
                      <div className="doc-section-header">
                        <div className="doc-section-title">
                          <Icon d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" size={15} />
                          Audit Log
                        </div>
                      </div>
                      <AuditPanel empId={empId} />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          empId={empId}
          onClose={() => setShowUpload(false)}
          onSuccess={(count, partial) => {
            setShowUpload(false);
            loadDocs(empId);
            loadExpiring();
            showToast(`${count} file${count > 1 ? 's' : ''} uploaded${partial ? ' (some failed)' : ''} successfully.`, partial ? 'error' : 'success');
          }}
        />
      )}

      {/* Preview modal */}
      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}
