import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosInstance";
import "./EmployeeDashboard.css";

// ─────────────────────────────────────────────
// ICON
// ─────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor" }) => (
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
// TOAST
// ─────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`emp-toast emp-toast--${type}`}>
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

// ─────────────────────────────────────────────
// SIDEBAR  (matches admin/HR sidebar exactly)
// ─────────────────────────────────────────────
function EmployeeSidebar({ activePage, onNavigate, onLogout, user }) {
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "E";

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    },
    {
      key: "leave",
      label: "My Leaves",
      icon: "M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18",
    },
    {
      key: "profile",
      label: "My Profile",
      icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    },
  ];

  return (
    <div className="emp-sidebar">
      {/* Brand */}
      <div className="emp-sidebar-brand">
        <div className="emp-sidebar-brand-icon">
          <Icon
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            size={20} stroke="white"
          />
        </div>
        <div>
          <div className="emp-sidebar-brand-title">HR Portal</div>
          <div className="emp-sidebar-brand-sub">Employee Dashboard</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="emp-sidebar-nav">
        <div className="emp-sidebar-group-label">MAIN</div>
        {navItems.map(item => (
          <button
            key={item.key}
            className={`emp-sidebar-item${activePage === item.key ? " emp-sidebar-item--active" : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            <Icon d={item.icon} size={17} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="emp-sidebar-footer">
        <div className="emp-sidebar-user">
          <div className="emp-sidebar-avatar">{initials}</div>
          <div>
            <div className="emp-sidebar-user-name">{user?.name || "Employee"}</div>
            <div className="emp-sidebar-user-role">Employee</div>
          </div>
        </div>
        <button className="emp-sidebar-signout" onClick={onLogout}>
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
function StatCard({ label, value, unit, icon, color }) {
  return (
    <div className={`emp-stat-card emp-stat-card--${color}`}>
      <div className="emp-stat-icon"><Icon d={icon} size={20} /></div>
      <div className="emp-stat-body">
        <div className="emp-stat-value">
          {value ?? "—"}
          {unit && <span className="emp-stat-unit">{unit}</span>}
        </div>
        <div className="emp-stat-label">{label}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const cls = s.includes("approved") ? "approved"
    : s.includes("pending")   ? "pending"
    : s.includes("rejected")  ? "rejected"
    : s.includes("cancelled") ? "cancelled" : "default";
  return <span className={`emp-badge emp-badge--${cls}`}>{status}</span>;
}

// ─────────────────────────────────────────────
// ALERTS
// ─────────────────────────────────────────────
function AlertBanners({ documents }) {
  if (!documents?.wp_expiring && !documents?.passport_expiring) return null;
  return (
    <div className="emp-alerts">
      {documents.wp_expiring && (
        <div className="emp-alert emp-alert--warning">
          <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" size={16} stroke="#d97706" />
          <span><strong>Work Permit Expiring Soon</strong> — Please contact HR for renewal.</span>
        </div>
      )}
      {documents.passport_expiring && (
        <div className="emp-alert emp-alert--danger">
          <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" size={16} stroke="#dc2626" />
          <span><strong>Passport Expiring Soon</strong> — Please arrange renewal.</span>
        </div>
      )}
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
  const [error,   setError]   = useState("");

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
    <div className="emp-modal-overlay" onClick={onClose}>
      <div className="emp-modal" onClick={e => e.stopPropagation()}>
        <div className="emp-modal-header">
          <Icon d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" size={20} stroke="white" />
          <span>Apply for Leave</span>
        </div>
        <div className="emp-modal-body">
          {error && (
            <div className="emp-modal-error">
              <Icon d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" size={15} stroke="#dc2626" />
              {error}
            </div>
          )}
          <div className="emp-form-row">
            <label>Leave Type</label>
            <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}>
              {leaveTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="emp-form-grid">
            <div className="emp-form-row">
              <label>Start Date <span className="emp-required">*</span></label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="emp-form-row">
              <label>End Date <span className="emp-required">*</span></label>
              <input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="emp-form-row">
            <label>Reason</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Brief reason (optional)..." rows={3} />
          </div>
        </div>
        <div className="emp-modal-footer">
          <button className="emp-btn emp-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="emp-btn emp-btn--primary" onClick={handleSubmit} disabled={loading}>
            {loading && <span className="emp-spinner" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LEAVE BALANCE BREAKDOWN
// ─────────────────────────────────────────────
function LeaveBalanceSection({ balance }) {
  if (!balance) return null;
  const types = [
    { label: "Annual",  color: "blue",  data: balance.annual  },
    { label: "Medical", color: "green", data: balance.medical },
    { label: "Casual",  color: "amber", data: balance.casual  },
  ];
  return (
    <div className="emp-section">
      <div className="emp-section-header">
        <div className="emp-section-title">
          <Icon d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" size={18} stroke="#2563eb" />
          Leave Balance — {new Date().getFullYear()}
        </div>
      </div>
      <div className="emp-balance-grid">
        {types.map(t => {
          const remaining = t.data?.remaining ?? 0;
          const entitled  = t.data?.entitled  ?? 0;
          const pct = entitled > 0 ? Math.round((remaining / entitled) * 100) : 0;
          return (
            <div key={t.label} className={`emp-balance-card emp-balance-card--${t.color}`}>
              <div className="emp-balance-top">
                <span className="emp-balance-label">{t.label}</span>
                <span className="emp-balance-remaining">
                  {remaining}<small>/{entitled}</small>
                </span>
              </div>
              <div className="emp-balance-track">
                <div className="emp-balance-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="emp-balance-sub">days remaining</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// RECENT LEAVES
// ─────────────────────────────────────────────
function RecentLeavesSection({ leaves, onApply }) {
  return (
    <div className="emp-section">
      <div className="emp-section-header">
        <div className="emp-section-title">
          <Icon d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" size={18} stroke="#6366f1" />
          Recent Leave Requests
        </div>
        <button className="emp-btn emp-btn--ghost emp-btn--sm" onClick={onApply}>+ Apply Leave</button>
      </div>

      {!leaves || leaves.length === 0 ? (
        <div className="emp-empty">
          <Icon d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" size={40} stroke="#9ca3af" />
          <p>No recent leave requests found.</p>
          <button className="emp-btn emp-btn--primary emp-btn--sm" onClick={onApply}>Apply for Leave</button>
        </div>
      ) : (
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id}>
                  <td className="td-type">{l.type}</td>
                  <td>{l.start_date}</td>
                  <td>{l.end_date}</td>
                  <td><span className="td-days">{l.total_days}</span></td>
                  <td><StatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PROFILE CARD
// ─────────────────────────────────────────────
function ProfileCard({ user }) {
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "E";
  return (
    <div className="emp-profile-card">
      <div className="emp-profile-avatar">{initials}</div>
      <div className="emp-profile-name">{user?.name}</div>
      <div className="emp-profile-id">{user?.emp_id}</div>
      <div className="emp-profile-divider" />
      <div className="emp-profile-rows">
        <div className="emp-profile-row">
          <span className="emp-profile-key">Designation</span>
          <span className="emp-profile-val">{user?.role || "—"}</span>
        </div>
        <div className="emp-profile-row">
          <span className="emp-profile-key">Division</span>
          <span className="emp-profile-val">{user?.division || "—"}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
function EmployeeDashboard() {
  const navigate = useNavigate();

  const [data,       setData]       = useState(null);
  const [balance,    setBalance]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [showModal,  setShowModal]  = useState(false);
  const [toast,      setToast]      = useState(null);

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

  const handleNavigate = (page) => {
    setActivePage(page);
    if (page === "profile") navigate("/profile");
    // "leave" stays on same page, scrolls to section, or navigate to /leave if you have it
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="dashboard-shell">
        <div className="emp-sidebar" style={{ opacity: 0.4 }} />
        <div className="dashboard-main">
          <div className="emp-full-center">
            <div className="emp-spinner emp-spinner--lg" />
            <span>Loading your dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-shell">
        <div className="dashboard-main">
          <div className="emp-full-center">
            <span style={{ fontSize: 32 }}>⚠️</span>
            <p>Failed to load dashboard</p>
            <button className="emp-btn emp-btn--primary" onClick={fetchData}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const { user, summary, documents, recent_leaves } = data;

  return (
    <div className="dashboard-shell">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {showModal && (
        <ApplyLeaveModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => { showToast(msg); fetchData(); }}
        />
      )}

      <EmployeeSidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={user}
      />

      <div className="dashboard-main">
        {/* Topbar */}
        <div className="dashboard-topbar">
          <div>
            <div className="topbar-title">Employee Dashboard</div>
            <div className="topbar-sub">Welcome back, {user.name} 👋</div>
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn primary" onClick={() => setShowModal(true)}>
              <Icon d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" size={15} stroke="white" />
              Apply Leave
            </button>
            <button className="topbar-btn" onClick={handleLogout}>
              <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={15} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          <AlertBanners documents={documents} />

          {/* Stat row */}
          <div className="emp-stats-grid">
            <StatCard
              label="Leave Balance" value={summary.leave_balance} unit="Days"
              icon="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18"
              color="blue"
            />
            <StatCard
              label="Pending Requests" value={summary.pending_requests}
              icon="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              color="amber"
            />
            <StatCard
              label="Upcoming Leaves" value={summary.upcoming_leaves}
              icon="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
              color="green"
            />
          </div>

          {/* Two-column grid */}
          <div className="emp-main-grid">
            <div className="emp-left-col">
              <LeaveBalanceSection balance={balance} />
              <RecentLeavesSection leaves={recent_leaves} onApply={() => setShowModal(true)} />
            </div>

            <div className="emp-right-col">
              {/* Profile section */}
              <div className="emp-section">
                <div className="emp-section-header">
                  <div className="emp-section-title">
                    <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={18} stroke="#0891b2" />
                    My Profile
                  </div>
                </div>
                <ProfileCard user={user} />
                <div style={{ padding: "0 16px 16px" }}>
                  <button className="emp-btn emp-btn--outline emp-btn--block" onClick={() => navigate("/profile")}>
                    View Full Profile
                  </button>
                </div>
              </div>

              {/* Quick actions */}
              <div className="emp-section">
                <div className="emp-section-header">
                  <div className="emp-section-title">
                    <Icon d="M13 10V3L4 14h7v7l9-11h-7z" size={18} stroke="#6366f1" />
                    Quick Actions
                  </div>
                </div>
                <div className="emp-quick-actions">
                  <button className="emp-quick-btn" onClick={() => setShowModal(true)}>
                    <Icon d="M12 5v14M5 12h14" size={22} stroke="#2563eb" />
                    <span>Apply Leave</span>
                    <small>Submit a new request</small>
                  </button>
                  <button className="emp-quick-btn" onClick={() => navigate("/profile")}>
                    <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={22} stroke="#0891b2" />
                    <span>My Profile</span>
                    <small>View full details</small>
                  </button>
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