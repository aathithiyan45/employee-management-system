import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosInstance";
import "./LeaveManagement.css";

// ── Icon ──────────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ── Toast ─────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`lm-toast lm-toast--${type}`}>
      <Icon d={type === "success"
        ? "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
        : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z"
      } size={15} stroke={type === "success" ? "#16a34a" : "#dc2626"} />
      <span>{message}</span>
      <button onClick={onClose}>×</button>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────
function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const cls = s.includes("approved") ? "approved"
    : s.includes("pending") ? "pending"
    : s.includes("rejected") ? "rejected"
    : s.includes("cancelled") ? "cancelled" : "default";
  return <span className={`lm-badge lm-badge--${cls}`}>{status}</span>;
}

// ── Sidebar (shared layout) ───────────────────────────────
function Sidebar({ navigate }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const initials = (user?.username || "A").slice(0, 2).toUpperCase();
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("selectedDivision");
    navigate("/");
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div className="sidebar-brand-name">HR Portal</div>
        <div className="sidebar-brand-sub">Admin Dashboard</div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        <button className="sidebar-link" onClick={() => navigate("/dashboard")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </button>
        <button className="sidebar-link" onClick={() => navigate("/employees")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Employees
        </button>
        <button className="sidebar-link" onClick={() => navigate("/import")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          Import Data
        </button>
        <button className="sidebar-link active">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Leave Management
        </button>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username || "Admin"}</div>
            <div className="sidebar-user-role">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Administrator"}
            </div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── Approve/Reject modal ──────────────────────────────────
function ReviewModal({ request, action, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState("");
  if (!request) return null;
  return (
    <div className="lm-modal-overlay" onClick={onCancel}>
      <div className="lm-modal" onClick={e => e.stopPropagation()}>
        <div className={`lm-modal-header lm-modal-header--${action}`}>
          <Icon d={action === "approve"
            ? "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
            : "M18 6 6 18M6 6l12 12"} size={20}
          />
          <span>{action === "approve" ? "Approve" : "Reject"} Leave Request</span>
        </div>
        <div className="lm-modal-body">
          <div className="lm-modal-info">
            <div className="lm-modal-row"><span>Employee</span><strong>{request.emp_name}</strong></div>
            <div className="lm-modal-row"><span>Leave Type</span><strong>{request.leave_type}</strong></div>
            <div className="lm-modal-row"><span>Period</span><strong>{request.start_date} → {request.end_date}</strong></div>
            <div className="lm-modal-row"><span>Days</span><strong>{request.total_days}</strong></div>
          </div>
          {action === "reject" && (
            <div className="lm-modal-reason">
              <label>Rejection Reason <span className="lm-required">*</span></label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={3}
              />
            </div>
          )}
        </div>
        <div className="lm-modal-footer">
          <button className="lm-btn lm-btn--ghost" onClick={onCancel}>Cancel</button>
          <button
            className={`lm-btn ${action === "approve" ? "lm-btn--approve" : "lm-btn--reject"}`}
            onClick={() => onConfirm(reason)}
            disabled={loading || (action === "reject" && !reason.trim())}
          >
            {loading ? <span className="lm-spinner" /> : null}
            {action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
function LeaveManagement() {
  const navigate = useNavigate();

  // filters — match backend leave_request_list GET params
  const [filters, setFilters] = useState({
    status: "",
    leave_type: "",
    emp_id: "",
    from_date: "",
    to_date: "",
    page_size: 20,
  });
  const [page, setPage]               = useState(1);
  const [requests, setRequests]       = useState([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [loading, setLoading]         = useState(false);

  // review modal state
  const [modal, setModal]             = useState(null); // { request, action }
  const [reviewLoading, setReviewLoading] = useState(false);

  const [toast, setToast]             = useState(null);
  const showToast = (message, type = "success") => setToast({ message, type });

  // ── Fetch leave requests ─────────────────────────────────
  // matches: GET /leave/requests/?status=&leave_type=&emp_id=&from_date=&to_date=&page=&page_size=
  const fetchRequests = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, ...filters });
    // strip empty values
    [...params.keys()].forEach(k => { if (!params.get(k)) params.delete(k); });

    api.get(`leave/requests/?${params.toString()}`)
      .then(res => {
        setRequests(res.data.results || []);
        setTotalCount(res.data.count || 0);
      })
      .catch(err => showToast(err.response?.data?.error || "Failed to load requests", "error"))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleFilterChange = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  // ── Approve — POST /leave/requests/{id}/approve/ ─────────
  const handleApprove = async (reason) => {
    setReviewLoading(true);
    try {
      await api.post(`leave/requests/${modal.request.id}/approve/`);
      showToast("Leave request approved successfully");
      setModal(null);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.error || "Approval failed", "error");
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Reject — POST /leave/requests/{id}/reject/  body: { reason } ──
  const handleReject = async (reason) => {
    setReviewLoading(true);
    try {
      await api.post(`leave/requests/${modal.request.id}/reject/`, { reason });
      showToast("Leave request rejected");
      setModal(null);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.error || "Rejection failed", "error");
    } finally {
      setReviewLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / filters.page_size);

  // ── Leave type options — match backend LeaveRequest.LEAVE_TYPE_CHOICES ──
  const leaveTypes = [
    { value: "",        label: "All Types" },
    { value: "medical", label: "Medical" },
    { value: "casual",  label: "Casual" },
    { value: "annual",  label: "Annual" },
    { value: "unpaid",  label: "Unpaid" },
  ];

  const statusOptions = [
    { value: "",         label: "All Status" },
    { value: "pending",  label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled",label: "Cancelled" },
  ];

  return (
    <div className="dashboard-shell">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ReviewModal
        request={modal?.request}
        action={modal?.action}
        onConfirm={modal?.action === "approve" ? handleApprove : handleReject}
        onCancel={() => setModal(null)}
        loading={reviewLoading}
      />

      <Sidebar navigate={navigate} />

      <div className="dashboard-main">
        {/* Topbar */}
        <div className="dashboard-topbar">
          <div className="topbar-title">Leave Management</div>
          <div className="topbar-actions">
            <button className="topbar-btn primary" onClick={() => navigate("/employees")}>
              <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={15} stroke="white" />
              View Employees
            </button>
          </div>
        </div>

        <div className="dashboard-content">

          {/* ── Stats strip ── */}
          <div className="lm-stats-strip">
            {[
              { label: "Total Requests", value: totalCount, color: "blue" },
              { label: "Pending",  value: requests.filter(r => r.status?.toLowerCase().includes("pending")).length,  color: "amber" },
              { label: "Approved", value: requests.filter(r => r.status?.toLowerCase().includes("approved")).length, color: "green" },
              { label: "Rejected", value: requests.filter(r => r.status?.toLowerCase().includes("rejected")).length, color: "red" },
            ].map(s => (
              <div key={s.label} className={`lm-stat lm-stat--${s.color}`}>
                <div className="lm-stat-value">{s.value}</div>
                <div className="lm-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Filters ── */}
          <div className="lm-filters">
            <div className="lm-filter-group">
              <label>Employee ID</label>
              <input
                type="text"
                placeholder="Search EMP ID…"
                value={filters.emp_id}
                onChange={e => handleFilterChange("emp_id", e.target.value)}
              />
            </div>
            <div className="lm-filter-group">
              <label>Leave Type</label>
              <select value={filters.leave_type} onChange={e => handleFilterChange("leave_type", e.target.value)}>
                {leaveTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="lm-filter-group">
              <label>Status</label>
              <select value={filters.status} onChange={e => handleFilterChange("status", e.target.value)}>
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="lm-filter-group">
              <label>From Date</label>
              <input type="date" value={filters.from_date} onChange={e => handleFilterChange("from_date", e.target.value)} />
            </div>
            <div className="lm-filter-group">
              <label>To Date</label>
              <input type="date" value={filters.to_date} onChange={e => handleFilterChange("to_date", e.target.value)} />
            </div>
            <button className="lm-btn lm-btn--ghost lm-filter-clear"
              onClick={() => { setFilters({ status:"", leave_type:"", emp_id:"", from_date:"", to_date:"", page_size:20 }); setPage(1); }}>
              <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />
              Clear
            </button>
          </div>

          {/* ── Table ── */}
          <div className="lm-table-wrap">
            {loading ? (
              <div className="lm-table-loading">
                <div className="lm-spinner lm-spinner--lg" />
                <span>Loading requests…</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="lm-empty">
                <Icon d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" size={40} stroke="#94a3b8" />
                <p>No leave requests found</p>
              </div>
            ) : (
              <table className="lm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Reviewed By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r, i) => {
                    const isPending = r.status?.toLowerCase().includes("pending");
                    return (
                      <tr key={r.id} className={isPending ? "lm-row--pending" : ""}>
                        <td className="lm-td-muted">{(page - 1) * filters.page_size + i + 1}</td>
                        <td>
                          <div className="lm-emp-cell">
                            <div className="lm-emp-avatar">
                              {(r.emp_name || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="lm-emp-name">{r.emp_name}</div>
                              <div className="lm-emp-id">{r.emp_id}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="lm-type-chip">{r.leave_type}</span></td>
                        <td className="lm-td-date">{r.start_date}</td>
                        <td className="lm-td-date">{r.end_date}</td>
                        <td className="lm-td-days">{r.total_days}d</td>
                        <td className="lm-td-reason" title={r.reason}>{r.reason || "—"}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td className="lm-td-muted">{r.reviewed_by || "—"}</td>
                        <td>
                          <div className="lm-actions">
                            {isPending && (
                              <>
                                <button
                                  className="lm-action-btn lm-action-btn--approve"
                                  title="Approve"
                                  onClick={() => setModal({ request: r, action: "approve" })}
                                >
                                  <Icon d="M20 6 9 17l-5-5" size={13} stroke="white" />
                                </button>
                                <button
                                  className="lm-action-btn lm-action-btn--reject"
                                  title="Reject"
                                  onClick={() => setModal({ request: r, action: "reject" })}
                                >
                                  <Icon d="M18 6 6 18M6 6l12 12" size={13} stroke="white" />
                                </button>
                              </>
                            )}
                            <button
                              className="lm-action-btn lm-action-btn--balance"
                              title="View Balance"
                              onClick={() => navigate(`/leave/balance/${r.emp_id}`)}
                            >
                              <Icon d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="lm-pagination">
              <span className="lm-pagination-info">
                Showing {(page - 1) * filters.page_size + 1}–{Math.min(page * filters.page_size, totalCount)} of {totalCount}
              </span>
              <div className="lm-pagination-btns">
                <button className="lm-page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                <button className="lm-page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={p} className={`lm-page-btn ${p === page ? "lm-page-btn--active" : ""}`}
                      onClick={() => setPage(p)}>{p}</button>
                  );
                })}
                <button className="lm-page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
                <button className="lm-page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeaveManagement;