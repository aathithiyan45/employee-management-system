import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { logout } from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./HRDashboard.css";

// ── Icon ──────────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ── Toast ─────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`hr-toast hr-toast--${type}`}>
      <Icon
        d={type === "success"
          ? "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
          : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z"}
        stroke={type === "success" ? "#16a34a" : "#dc2626"}
      />
      <span>{message}</span>
      <button onClick={onClose}>×</button>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────
function StatusBadge({ status }) {
  const s   = (status || "").toLowerCase();
  const cls = s.includes("approved") ? "approved"
    : s.includes("pending")  ? "pending"
    : s.includes("rejected") ? "rejected"
    : s.includes("cancelled")? "cancelled" : "default";
  return <span className={`hr-badge hr-badge--${cls}`}>{status}</span>;
}

// ── Confirm Modal ─────────────────────────────────────────
function ReviewModal({ request, action, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState("");
  if (!request) return null;

  return (
    <div className="hr-modal-overlay" onClick={onCancel}>
      <div className="hr-modal" onClick={e => e.stopPropagation()}>
        <div className={`hr-modal-header hr-modal-header--${action}`}>
          <Icon
            d={action === "approve"
              ? "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
              : "M18 6 6 18M6 6l12 12"}
            size={20} stroke="white"
          />
          <span>{action === "approve" ? "Approve" : "Reject"} Leave Request</span>
        </div>

        <div className="hr-modal-body">
          <div className="hr-modal-info">
            <div className="hr-modal-row"><span>Employee</span><strong>{request.emp_name}</strong></div>
            <div className="hr-modal-row"><span>Leave Type</span><strong>{request.leave_type}</strong></div>
            <div className="hr-modal-row"><span>Period</span><strong>{request.start_date} → {request.end_date}</strong></div>
            <div className="hr-modal-row"><span>Days</span><strong>{request.total_days} day(s)</strong></div>
            {request.reason && (
              <div className="hr-modal-row"><span>Reason</span><strong>{request.reason}</strong></div>
            )}
          </div>

          {action === "reject" && (
            <div className="hr-modal-reason">
              <label>Rejection Reason <span className="hr-required">*</span></label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Provide a clear reason for rejection..."
                rows={3}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="hr-modal-footer">
          <button className="hr-btn hr-btn--ghost" onClick={onCancel}>Cancel</button>
          <button
            className={`hr-btn ${action === "approve" ? "hr-btn--approve" : "hr-btn--reject"}`}
            onClick={() => onConfirm(reason)}
            disabled={loading || (action === "reject" && !reason.trim())}
          >
            {loading && <span className="hr-spinner" />}
            {action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ label, value, icon, color, onClick }) {
  return (
    <div
      className={`hr-stat-card hr-stat-card--${color}${onClick ? " hr-stat-card--clickable" : ""}`}
      onClick={onClick}
    >
      <div className="hr-stat-icon"><Icon d={icon} size={20} /></div>
      <div className="hr-stat-body">
        <div className="hr-stat-value">{value ?? "—"}</div>
        <div className="hr-stat-label">{label}</div>
      </div>
      {onClick && (
        <div className="hr-stat-arrow">
          <Icon d="M9 18l6-6-6-6" size={14} />
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
function HRDashboard() {
  const navigate = useNavigate();

  const [pendingRequests, setPendingRequests] = useState([]);
  const [stats, setStats]                     = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [modal, setModal]                     = useState(null);
  const [reviewLoading, setReviewLoading]     = useState(false);
  const [toast, setToast]                     = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  // ── Load pending leave requests + summary stats ──────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        api.get("leave/requests/?status=pending&page_size=10"),
        api.get("leave/requests/?page_size=100"),
      ]);

      const pending  = pendingRes.data.results || [];
      const all      = allRes.data.results     || [];
      const total    = allRes.data.count       || 0;

      setPendingRequests(pending);
      setStats({
        total,
        pending:   pending.length,
        approved:  all.filter(r => r.status?.toLowerCase().includes("approved")).length,
        rejected:  all.filter(r => r.status?.toLowerCase().includes("rejected")).length,
      });
    } catch (err) {
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Approve ───────────────────────────────────────────────
  const handleApprove = async () => {
    setReviewLoading(true);
    try {
      await api.post(`leave/requests/${modal.request.id}/approve/`);
      showToast(`Approved ${modal.request.emp_name}'s leave request`);
      setModal(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "Approval failed", "error");
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Reject ────────────────────────────────────────────────
  const handleReject = async (reason) => {
    setReviewLoading(true);
    try {
      await api.post(`leave/requests/${modal.request.id}/reject/`, { reason });
      showToast(`Rejected ${modal.request.emp_name}'s leave request`);
      setModal(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || "Rejection failed", "error");
    } finally {
      setReviewLoading(false);
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="dashboard-shell">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <ReviewModal
        request={modal?.request}
        action={modal?.action}
        onConfirm={modal?.action === "approve" ? handleApprove : handleReject}
        onCancel={() => setModal(null)}
        loading={reviewLoading}
      />

      <Sidebar />

      <div className="dashboard-main">
        {/* ── Topbar ── */}
        <div className="dashboard-topbar">
          <div>
            <div className="topbar-title">HR Dashboard</div>
            <div className="topbar-sub">Welcome back, {user?.username || "HR"}</div>
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn primary" onClick={() => navigate("/leave")}>
              <Icon d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" size={15} stroke="white" />
              All Leave Requests
            </button>
            <button className="topbar-btn" onClick={logout}>
              <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={15} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="dashboard-content">

          {/* ── Stat Cards ── */}
          <div className="hr-stats-grid">
            <StatCard
              label="Pending Approval"
              value={stats?.pending}
              icon="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              color="amber"
              onClick={() => navigate("/leave")}
            />
            <StatCard
              label="Approved This Month"
              value={stats?.approved}
              icon="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
              color="green"
            />
            <StatCard
              label="Rejected"
              value={stats?.rejected}
              icon="M18 6 6 18M6 6l12 12"
              color="red"
            />
            <StatCard
              label="Total Requests"
              value={stats?.total}
              icon="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
              color="blue"
            />
          </div>

          {/* ── Pending Requests Queue ── */}
          <div className="hr-section">
            <div className="hr-section-header">
              <div className="hr-section-title">
                <Icon d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={18} stroke="#d97706" />
                Pending Approvals
                {stats?.pending > 0 && (
                  <span className="hr-badge-count">{stats.pending}</span>
                )}
              </div>
              <button className="hr-btn hr-btn--ghost hr-btn--sm" onClick={() => navigate("/leave")}>
                View All →
              </button>
            </div>

            {loading ? (
              <div className="hr-loading">
                <div className="hr-spinner hr-spinner--lg" />
                <span>Loading requests…</span>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="hr-empty">
                <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" size={40} stroke="#22c55e" />
                <p>No pending requests — all caught up!</p>
              </div>
            ) : (
              <div className="hr-request-list">
                {pendingRequests.map(r => (
                  <div key={r.id} className="hr-request-card">
                    <div className="hr-request-avatar">
                      {(r.emp_name || "?").slice(0, 2).toUpperCase()}
                    </div>

                    <div className="hr-request-info">
                      <div className="hr-request-name">{r.emp_name}</div>
                      <div className="hr-request-meta">
                        <span className="hr-type-chip">{r.leave_type}</span>
                        <span className="hr-request-dates">
                          {r.start_date} → {r.end_date}
                        </span>
                        <span className="hr-request-days">{r.total_days}d</span>
                      </div>
                      {r.reason && (
                        <div className="hr-request-reason">"{r.reason}"</div>
                      )}
                    </div>

                    <div className="hr-request-actions">
                      <button
                        className="hr-action-btn hr-action-btn--approve"
                        title="Approve"
                        onClick={() => setModal({ request: r, action: "approve" })}
                      >
                        <Icon d="M20 6 9 17l-5-5" size={14} stroke="white" />
                        Approve
                      </button>
                      <button
                        className="hr-action-btn hr-action-btn--reject"
                        title="Reject"
                        onClick={() => setModal({ request: r, action: "reject" })}
                      >
                        <Icon d="M18 6 6 18M6 6l12 12" size={14} stroke="white" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Quick Actions ── */}
          <div className="hr-section">
            <div className="hr-section-header">
              <div className="hr-section-title">
                <Icon d="M13 10V3L4 14h7v7l9-11h-7z" size={18} stroke="#6366f1" />
                Quick Actions
              </div>
            </div>
            <div className="hr-quick-actions">
              <button className="hr-quick-btn" onClick={() => navigate("/leave")}>
                <Icon d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" size={22} stroke="#6366f1" />
                <span>Manage Leave Requests</span>
                <small>Approve, reject, filter all requests</small>
              </button>
              <button className="hr-quick-btn" onClick={() => navigate("/employees")}>
                <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" size={22} stroke="#0891b2" />
                <span>View Employees</span>
                <small>Browse employee directory</small>
              </button>
              <button className="hr-quick-btn" onClick={() => navigate("/leave?status=pending")}>
                <Icon d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={22} stroke="#d97706" />
                <span>Pending Only</span>
                <small>Filter to requests awaiting action</small>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default HRDashboard;