import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./LeaveManagement.css";

// ── Icon ──────────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
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

// ... (BalanceRing stays) ...

// ── Balance ring visual ───────────────────────────────────
function BalanceRing({ entitled, used, remaining, color, label }) {
  const pct = entitled > 0 ? Math.round((remaining / entitled) * 100) : 0;
  const r = 38, cx = 44, cy = 44;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <div className="lb-ring-card">
      <div className="lb-ring-wrap">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="lb-ring-pct" style={{ color }}>{pct}%</div>
      </div>
      <div className="lb-ring-label">{label}</div>
      <div className="lb-ring-stats">
        <div className="lb-ring-stat">
          <span className="lb-ring-stat-num">{entitled}</span>
          <span className="lb-ring-stat-lbl">Entitled</span>
        </div>
        <div className="lb-ring-stat">
          <span className="lb-ring-stat-num" style={{ color: "#ef4444" }}>{used}</span>
          <span className="lb-ring-stat-lbl">Used</span>
        </div>
        <div className="lb-ring-stat">
          <span className="lb-ring-stat-num" style={{ color }}>{remaining}</span>
          <span className="lb-ring-stat-lbl">Left</span>
        </div>
      </div>
    </div>
  );
}

// ── Adjust modal ──────────────────────────────────────────
function AdjustModal({ empId, year, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    leave_type: "medical",
    action: "add",
    days: "",
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // POST /leave/balance/{emp_id}/adjust/
  // body: { year, leave_type, action, days, note }
  const handleSubmit = async () => {
    if (!form.days || isNaN(form.days) || Number(form.days) <= 0) {
      setError("Days must be a positive number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`leave/balance/${empId}/adjust/`, {
        year,
        leave_type: form.leave_type,
        action: form.action,
        days: parseInt(form.days),
        note: form.note,
      });
      onSuccess(res.data.message || "Balance adjusted");
    } catch (err) {
      setError(err.response?.data?.error || "Adjustment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lm-modal-overlay" onClick={onCancel}>
      <div className="lm-modal" onClick={e => e.stopPropagation()}>
        <div className="lm-modal-header lm-modal-header--adjust">
          <Icon d="M12 4v16m8-8H4" size={20} />
          <span>Adjust Leave Balance</span>
        </div>
        <div className="lm-modal-body">
          <div className="lb-adjust-grid">
            <div className="lb-adjust-field">
              <label>Leave Type</label>
              <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}>
                <option value="medical">Medical</option>
                <option value="casual">Casual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className="lb-adjust-field">
              <label>Action</label>
              <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}>
                <option value="add">Add Days (restore used)</option>
                <option value="deduct">Deduct Days (mark used)</option>
              </select>
            </div>
            <div className="lb-adjust-field">
              <label>Number of Days</label>
              <input type="number" min="1" placeholder="e.g. 2"
                value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} />
            </div>
            <div className="lb-adjust-field lb-adjust-field--full">
              <label>Note / Reason</label>
              <input type="text" placeholder="Optional note…"
                value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          {error && <div className="lb-adjust-error">{error}</div>}
        </div>
        <div className="lm-modal-footer">
          <button className="lm-btn lm-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="lm-btn lm-btn--approve" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="lm-spinner" /> : null}
            Confirm Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main LeaveBalance page ────────────────────────────────
function LeaveBalance() {
  const { empId }    = useParams();
  const navigate     = useNavigate();
  const currentYear  = new Date().getFullYear();

  const [year, setYear]         = useState(currentYear);
  const [balance, setBalance]   = useState(null);
  const [history, setHistory]   = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  // ── GET /leave/balance/{emp_id}/?year=YYYY  →  leave_balance view ──
  const fetchBalance = useCallback(() => {
    if (!empId) return;
    setLoading(true);
    api.get(`leave/balance/${empId}/?year=${year}`)
      .then(res => setBalance(res.data))
      .catch(err => {
        if (err.response?.status === 404) setBalance(null);
        else showToast(err.response?.data?.error || "Failed to load balance", "error");
      })
      .finally(() => setLoading(false));
  }, [empId, year]);

  // ── GET /leave/requests/?emp_id=X  →  leave history ──────
  const fetchHistory = useCallback(() => {
    if (!empId) return;
    setHistLoading(true);
    api.get(`leave/requests/?emp_id=${empId}&page_size=10`)
      .then(res => setHistory(res.data.results || []))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [empId]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const ringConfigs = balance ? [
    { key: "medical", label: "Medical Leave",  color: "#3b82f6", ...balance.medical },
    { key: "casual",  label: "Casual Leave",   color: "#10b981", ...balance.casual  },
    { key: "annual",  label: "Annual Leave",   color: "#f59e0b", ...balance.annual  },
  ] : [];

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="dashboard-shell">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showAdjust && (
        <AdjustModal
          empId={empId}
          year={year}
          onSuccess={(msg) => { showToast(msg); setShowAdjust(false); fetchBalance(); }}
          onCancel={() => setShowAdjust(false)}
        />
      )}

      <Sidebar navigate={navigate} />

      <div className="dashboard-main">
        <div className="dashboard-topbar">
          <div className="topbar-title">
            Leave Balance
            {balance?.emp_id && <span className="lb-topbar-empid">· {balance.emp_id}</span>}
          </div>
          <div className="topbar-actions">
            <button className="lm-btn lm-btn--ghost lb-back-btn"
              onClick={() => navigate("/leave")}>
              <Icon d="M19 12H5M12 19l-7-7 7-7" size={15} />
              Back to Leave
            </button>
            <select className="topbar-select" value={year}
              onChange={e => setYear(Number(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="topbar-btn primary" onClick={() => setShowAdjust(true)}>
              <Icon d="M12 4v16m8-8H4" size={15} stroke="white" />
              Adjust Balance
            </button>
          </div>
        </div>

        <div className="dashboard-content">

          {/* ── Balance rings ── */}
          {loading ? (
            <div className="lm-table-loading">
              <div className="lm-spinner lm-spinner--lg" />
              <span>Loading balance…</span>
            </div>
          ) : balance ? (
            <>
              <div className="lb-year-heading">
                Leave Balance for <strong>{year}</strong>
                {balance.emp_id && <> — <strong>{balance.emp_id}</strong></>}
              </div>
              <div className="lb-rings-grid">
                {ringConfigs.map(cfg => (
                  <BalanceRing key={cfg.key}
                    label={cfg.label}
                    color={cfg.color}
                    entitled={cfg.entitled}
                    used={cfg.used}
                    remaining={cfg.remaining}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="lm-empty">
              <Icon d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" size={40} stroke="#94a3b8" />
              <p>No leave balance record for {year}.</p>
              <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                Create a leave balance record for this employee via HR admin, or use the Adjust button.
              </p>
            </div>
          )}

          {/* ── Recent leave history for this employee ── */}
          <div className="lb-history">
            <h3 className="lb-history-title">Recent Leave Requests</h3>
            {histLoading ? (
              <div className="lm-table-loading" style={{ height: 80 }}>
                <div className="lm-spinner" /><span>Loading history…</span>
              </div>
            ) : history.length === 0 ? (
              <div className="lb-history-empty">No leave requests found for this employee.</div>
            ) : (
              <table className="lm-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Reviewed By</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(r => (
                    <tr key={r.id}>
                      <td><span className="lm-type-chip">{r.leave_type}</span></td>
                      <td className="lm-td-date">{r.start_date}</td>
                      <td className="lm-td-date">{r.end_date}</td>
                      <td className="lm-td-days">{r.total_days}d</td>
                      <td className="lm-td-reason" title={r.reason}>{r.reason || "—"}</td>
                      <td><span className={`lm-badge lm-badge--${(r.status||"").toLowerCase().includes("approved")?"approved":(r.status||"").toLowerCase().includes("pending")?"pending":(r.status||"").toLowerCase().includes("rejected")?"rejected":"cancelled"}`}>{r.status}</span></td>
                      <td className="lm-td-muted">{r.reviewed_by || "—"}</td>
                      <td className="lm-td-muted">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeaveBalance;