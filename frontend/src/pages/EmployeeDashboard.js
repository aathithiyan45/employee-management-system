import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./EmployeeDashboard.css";

// ─────────────────────────────────────────────
// ICON  (same helper as admin Dashboard)
// ─────────────────────────────────────────────
const Icon = ({ d, size = 17, stroke = "currentColor" }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={stroke} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d={d} />
  </svg>
);

// ─────────────────────────────────────────────
// TOAST  (same pattern as admin)
// ─────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <Icon
        d={type === "success"
          ? "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
          : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z"}
        size={16}
        stroke={type === "success" ? "#16a34a" : "#dc2626"}
      />
      <span>{message}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// APPLY LEAVE MODAL
// ─────────────────────────────────────────────
function ApplyLeaveModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const leaveTypes = [
    { value: "annual",  label: "Annual Leave"  },
    { value: "medical", label: "Medical Leave" },
    { value: "casual",  label: "Casual Leave"  },
    { value: "unpaid",  label: "Unpaid Leave"  },
  ];

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date) { setError("Start and end dates are required."); return; }
    if (form.end_date < form.start_date)    { setError("End date cannot be before start date."); return; }
    setLoading(true); setError("");
    try {
      await api.post("leave/requests/", form);
      onSuccess("Leave request submitted successfully!");
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit leave request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <Icon
            d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18"
            size={20} stroke="white"
          />
          <span>Apply for Leave</span>
        </div>
        <div className="modal-body">
          {error && (
            <div className="modal-error">
              <Icon d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" size={15} stroke="#dc2626" />
              {error}
            </div>
          )}
          <div className="form-row">
            <label>Leave Type</label>
            <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}>
              {leaveTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-grid-2">
            <div className="form-row">
              <label>Start Date <span className="required">*</span></label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="form-row">
              <label>End Date <span className="required">*</span></label>
              <input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <label>Reason</label>
            <textarea
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Brief reason (optional)…"
              rows={3}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading && <span className="loading-spinner-sm" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
function EmployeeDashboard() {
  const navigate = useNavigate();

  const [data,      setData]      = useState(null);
  const [balance,   setBalance]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast,     setToast]     = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("employee-dashboard/");
      setData(res.data);
      try {
        const balRes = await api.get(`leave/balance/${res.data.user.emp_id}/`);
        setBalance(balRes.data);
      } catch (_) {}
    } catch {
      showToast("Failed to load dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <div className="dashboard-shell">
        <Sidebar />
        <div className="dashboard-main">
          <div className="dashboard-topbar">
            <div>
              <div className="emp-skeleton" style={{ width:200, height:22, borderRadius:6, marginBottom:6 }} />
              <div className="emp-skeleton" style={{ width:140, height:14, borderRadius:6 }} />
            </div>
            <div className="emp-skeleton" style={{ width:120, height:36, borderRadius:6 }} />
          </div>
          <div className="dashboard-content">
            <div className="emp-skeleton" style={{ width:"100%", height:48, borderRadius:8 }} />
            <div className="emp-stats-grid">
              {[1,2,3].map(i => (
                <div key={i} className="emp-stat-card">
                  <div className="emp-skeleton" style={{ width:46, height:46, borderRadius:10 }} />
                  <div style={{ flex:1 }}>
                    <div className="emp-skeleton" style={{ width:"60%", height:26, borderRadius:6, marginBottom:8 }} />
                    <div className="emp-skeleton" style={{ width:"80%", height:13, borderRadius:6 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="balance-grid">
              {[1,2,3].map(i => (
                <div key={i} className="emp-balance-card emp-balance-card--blue" style={{ padding:16 }}>
                  <div className="emp-skeleton" style={{ width:"50%", height:13, borderRadius:6, marginBottom:10 }} />
                  <div className="emp-skeleton" style={{ width:"35%", height:24, borderRadius:6, marginBottom:8 }} />
                  <div className="emp-skeleton" style={{ width:"100%", height:5, borderRadius:99 }} />
                </div>
              ))}
            </div>
            <div style={{ background:"white", borderRadius:12, border:"1px solid var(--grey-200)", padding:20, boxShadow:"var(--shadow-sm)" }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ display:"flex", gap:16, marginBottom:14 }}>
                  <div className="emp-skeleton" style={{ flex:1, height:14, borderRadius:6 }} />
                  <div className="emp-skeleton" style={{ flex:1, height:14, borderRadius:6 }} />
                  <div className="emp-skeleton" style={{ flex:1, height:14, borderRadius:6 }} />
                  <div className="emp-skeleton" style={{ width:70, height:22, borderRadius:20 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-main">
          <div className="full-center">
            <span style={{ fontSize: 32 }}>⚠️</span>
            <p>Failed to load dashboard</p>
            <button className="btn btn-primary" onClick={fetchData}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const { user, summary, documents, recent_leaves } = data;

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "E";

  // Leave balance types
  const leaveTypes = [
    { label: "Annual",  color: "blue",  data: balance?.annual  },
    { label: "Medical", color: "green", data: balance?.medical },
    { label: "Casual",  color: "amber", data: balance?.casual  },
  ];

  // Stat cards — same structure as admin
  const cards = [
    {
      label:    "Leave Balance",
      value:    summary.leave_balance,
      unit:     "Days",
      type:     "total",
      iconPath: "M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18",
    },
    {
      label:    "Pending Requests",
      value:    summary.pending_requests,
      type:     "warning",
      iconPath: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    },
    {
      label:    "Upcoming Leaves",
      value:    summary.upcoming_leaves,
      type:     "success",
      iconPath: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
    },
  ];

  return (
    <div className="dashboard-shell">

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Modal ── */}
      {showModal && (
        <ApplyLeaveModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => { showToast(msg); fetchData(); }}
        />
      )}

      <Sidebar />

      {/* ══ MAIN ══════════════════════════════════════════ */}
      <div className="dashboard-main">

        {/* Topbar — mirrors admin topbar */}
        <div className="dashboard-topbar">
          <div className="topbar-title">Employee Dashboard</div>
          <div className="topbar-actions">
            <button className="topbar-btn primary" onClick={() => setShowModal(true)}>
              <Icon d="M12 5v14M5 12h14" size={15} stroke="white" />
              Apply Leave
            </button>
            <button className="topbar-btn secondary" onClick={() => navigate("/profile")}>
              <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={15} />
              My Profile
            </button>
            <button className="topbar-btn secondary" onClick={handleLogout}>
              <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={15} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="dashboard-content">

          {/* Greeting — same as admin */}
          <div className="dashboard-greeting">
            <h2>Good day, {user.name} 👋</h2>
            <p>{user.role} &bull; {user.division} &bull; ID: <strong>{user.emp_id}</strong></p>
          </div>

          {/* Alert Banners */}
          {(documents?.wp_expiring || documents?.passport_expiring) && (
            <div className="alerts-row">
              {documents.wp_expiring && (
                <div className="alert-banner alert-warning">
                  <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" size={16} stroke="#d97706" />
                  <span><strong>Work Permit Expiring Soon</strong> — Please contact HR for renewal.</span>
                </div>
              )}
              {documents.passport_expiring && (
                <div className="alert-banner alert-danger">
                  <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" size={16} stroke="#dc2626" />
                  <span><strong>Passport Expiring Soon</strong> — Please arrange renewal immediately.</span>
                </div>
              )}
            </div>
          )}

          {/* ── Stat Cards — same structure as admin ── */}
          <div className="cards-grid">
            {cards.map(card => (
              <div key={card.label} className={`stat-card ${card.type}`}>
                <div className="stat-card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.iconPath} />
                  </svg>
                </div>
                <div className="stat-card-label">{card.label}</div>
                <div className="stat-card-value">
                  {card.value ?? "—"}
                  {card.unit && <span className="stat-card-unit">{card.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ── Two-column layout (mirrors admin chart section width) ── */}
          <div className="emp-content-grid">

            {/* LEFT — Leave Balance + Recent Leaves */}
            <div className="emp-left">

              {/* Leave Balance */}
              <div className="content-card">
                <div className="content-card-header">
                  <h4>
                    <Icon d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" size={16} stroke="#2563eb" />
                    Leave Balance — {new Date().getFullYear()}
                  </h4>
                </div>
                <div className="balance-grid">
                  {leaveTypes.map(t => {
                    const remaining = t.data?.remaining ?? 0;
                    const entitled  = t.data?.entitled  ?? 0;
                    const pct = entitled > 0 ? Math.round((remaining / entitled) * 100) : 0;
                    return (
                      <div key={t.label} className={`balance-card balance-card--${t.color}`}>
                        <div className="balance-top">
                          <span className="balance-label">{t.label}</span>
                          <span className="balance-value">{remaining}<small>/{entitled}</small></span>
                        </div>
                        <div className="balance-track">
                          <div className="balance-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="balance-sub">days remaining</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Leave Requests */}
              <div className="content-card">
                <div className="content-card-header">
                  <h4>
                    <Icon d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" size={16} stroke="#6366f1" />
                    Recent Leave Requests
                  </h4>
                  <button className="topbar-btn secondary btn-sm" onClick={() => setShowModal(true)}>
                    + Apply Leave
                  </button>
                </div>

                {!recent_leaves || recent_leaves.length === 0 ? (
                  <div className="empty-state">
                    <Icon d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" size={36} stroke="#9ca3af" />
                    <p>No recent leave requests found.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Apply for Leave</button>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Days</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent_leaves.map(l => {
                          const s = (l.status || "").toLowerCase();
                          const statusCls = s.includes("approved") ? "approved"
                            : s.includes("pending")   ? "pending"
                            : s.includes("rejected")  ? "rejected"
                            : s.includes("cancelled") ? "cancelled" : "default";
                          return (
                            <tr key={l.id}>
                              <td className="td-bold">{l.type}</td>
                              <td>{l.start_date}</td>
                              <td>{l.end_date}</td>
                              <td><span className="days-chip">{l.total_days}</span></td>
                              <td><span className={`status-badge status-${statusCls}`}>{l.status}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Profile + Quick Actions */}
            <div className="emp-right">

              {/* Profile Card */}
              <div className="content-card">
                <div className="content-card-header">
                  <h4>
                    <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={16} stroke="#0891b2" />
                    My Profile
                  </h4>
                </div>
                <div className="profile-body">
                  <div className="profile-avatar-wrap">
                    <div className="profile-avatar-lg">{initials}</div>
                    <div className="profile-name">{user.name}</div>
                    <div className="profile-id">{user.emp_id}</div>
                  </div>
                  <div className="profile-divider" />
                  <div className="profile-rows">
                    {[
                      { label: "Designation", value: user.role     },
                      { label: "Division",    value: user.division },
                    ].map(row => (
                      <div key={row.label} className="profile-row">
                        <span className="profile-key">{row.label}</span>
                        <span className="profile-val">{row.value || "—"}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn btn-outline btn-block"
                    onClick={() => navigate("/profile")}
                  >
                    View Full Profile
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="content-card">
                <div className="content-card-header">
                  <h4>
                    <Icon d="M13 10V3L4 14h7v7l9-11h-7z" size={16} stroke="#6366f1" />
                    Quick Actions
                  </h4>
                </div>
                <div className="quick-actions">
                  {[
                    {
                      label: "Apply Leave",
                      sub:   "Submit a new request",
                      icon:  "M12 5v14M5 12h14",
                      color: "#2563eb",
                      action: () => setShowModal(true),
                    },
                    {
                      label: "My Profile",
                      sub:   "View & edit details",
                      icon:  "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
                      color: "#0891b2",
                      action: () => navigate("/profile"),
                    },
                    {
                      label: "Change Password",
                      sub:   "Update your credentials",
                      icon:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
                      color: "#7c3aed",
                      action: () => navigate("/change-password"),
                    },
                  ].map(a => (
                    <button key={a.label} className="quick-btn" onClick={a.action}>
                      <span className="quick-btn-icon" style={{ color: a.color }}>
                        <Icon d={a.icon} size={20} stroke={a.color} />
                      </span>
                      <span className="quick-btn-text">
                        <span className="quick-btn-label">{a.label}</span>
                        <span className="quick-btn-sub">{a.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeDashboard;