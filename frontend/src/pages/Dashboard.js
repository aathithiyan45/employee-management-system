import { useEffect, useState } from "react";
import api, { logout } from "../axiosInstance";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Line, Bar } from "react-chartjs-2";
import "./Dashboard.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
);

// ── Icon helper ───────────────────────────────────────────
const Icon = ({ d, size = 17, stroke = "currentColor" }) => (
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

function Dashboard() {
  // ── user from localStorage — backend returns `username` ──
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // username may be a single word — just take first 2 chars
  const initials = (user?.username || "A").slice(0, 2).toUpperCase();

  const [data, setData] = useState({
    total_employees:     0,
    active_employees:    0,
    inactive_employees:  0,
    wp_expiring:         0,
    passport_expiring:   0,
    incomplete_profiles: 0,
  });

  const [division, setDivision]   = useState(
    localStorage.getItem("selectedDivision") || ""
  );
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast]         = useState(null); // { message, type }

  const [divisionChartData,    setDivisionChartData]    = useState(null);
  const [monthlyGrowthData,    setMonthlyGrowthData]    = useState(null);
  const [designationChartData, setDesignationChartData] = useState(null);

  const navigate = useNavigate();

  const showToast = (message, type = "success") => setToast({ message, type });

  // ── Guard: redirect if not logged in ─────────────────────
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    if (!u) navigate("/");
  }, [navigate]);

  // ── Fetch divisions ───────────────────────────────────────
  useEffect(() => {
    api.get("divisions/")
      .then((res) => {
        setDivisions(res.data);
        // set default only if nothing saved yet
        if (!localStorage.getItem("selectedDivision") && res.data.length > 0) {
          const defaultDiv = res.data[0].name;
          setDivision(defaultDiv);
          localStorage.setItem("selectedDivision", defaultDiv);
        }
      })
      .catch((err) => console.error("Divisions fetch error:", err));
  }, []); // run once only

  // ── Persist division selection ────────────────────────────
  useEffect(() => {
    if (division) localStorage.setItem("selectedDivision", division);
  }, [division]);

  // ── Fetch dashboard stats + charts on division change ─────
  useEffect(() => {
    if (!division) return;
    fetchDashboard(division);
    fetchCharts(division);
  }, [division]);

  // ── dashboard/?division=X  →  matches views.py dashboard_view ──
  const fetchDashboard = (div) => {
    api.get(`dashboard/?division=${div}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error("Dashboard fetch error:", err));
  };

  // ── chart endpoints — match views.py exactly ──────────────
  const fetchCharts = (div) => {
    api.get(`charts/division-distribution/?division=${div}`)
      .then((res) => setDivisionChartData(res.data))
      .catch((err) => console.error("Division chart error:", err));

    api.get(`charts/monthly-growth/?division=${div}`)
      .then((res) => setMonthlyGrowthData(res.data))
      .catch((err) => console.error("Monthly growth error:", err));

    api.get(`charts/designation-breakdown/?division=${div}`)
      .then((res) => setDesignationChartData(res.data))
      .catch((err) => console.error("Designation chart error:", err));
  };

  // ── Quick import from topbar (redirects to proper import page) ──
  // Backend import_excel expects a single file with IS_ACTIVE column.
  // For a proper UX with column preview and result stats → use /import page.
  // This topbar shortcut does a direct fire-and-forget upload.
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      showToast("Only .xlsx / .xls files allowed", "error");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    // No sheet_type — backend uses IS_ACTIVE column

    setLoading(true);
    try {
      const res = await api.post("import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { created = 0, updated = 0, skipped = 0 } = res.data;
      showToast(
        `Import done — Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`,
        "success"
      );
      fetchDashboard(division);
      fetchCharts(division);
    } catch (err) {
      const msg = err.response?.data?.error || "Import failed";
      showToast(msg, "error");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // ── Export — uses backend export_employees endpoint ───────
  // views.py: GET /export/?division=X  → returns JSON array
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = division && division !== "all"
        ? `?division=${division}`
        : "";

      const res = await api.get(`export/${params}`);
      const employees = res.data;

      if (!employees || employees.length === 0) {
        showToast("No employees found for this division", "error");
        return;
      }

      // Build CSV from backend's export_employees field order
      const headers = Object.keys(employees[0]);
      const rows = employees.map((e) =>
        headers.map((h) => {
          const val = e[h];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
      );

      let csv = headers.map((h) => `"${h}"`).join(",") + "\n";
      rows.forEach((row) => { csv += row.join(",") + "\n"; });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `employees_${division}_${Date.now()}.csv`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${employees.length} employee records`, "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Export failed", "error");
    } finally {
      setExportLoading(false);
    }
  };

  // logout() calls POST /api/logout/ to blacklist the refresh token on the
  // server before clearing localStorage — prevents token replay after sign-out.
  const handleLogout = () => logout();

  // ── Stat card click → navigate to employees with filters ─
  const getCardFilter = (label) => {
    switch (label) {
      case "Total Employees":    return {};
      case "Active":             return { status: "active" };
      case "Inactive":           return { status: "inactive" };
      case "WP Expiring":        return { expiry_alert: "wp" };
      case "Passport Expiring":  return { expiry_alert: "passport" };
      case "Incomplete Profiles":return { incomplete: "true" };
      default:                   return {};
    }
  };

  const handleCardClick = (label) => {
    const filters = getCardFilter(label);
    const params  = new URLSearchParams({ division, ...filters });
    navigate(`/employees?${params.toString()}`);
  };

  // ── Card definitions ──────────────────────────────────────
  const cards = [
    {
      label:    "Total Employees",
      value:    data.total_employees,
      type:     "total",
      iconPath: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    },
    {
      label:    "Active",
      value:    data.active_employees,
      type:     "success",
      iconPath: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
    },
    {
      label:    "Inactive",
      value:    data.inactive_employees,
      type:     "danger",
      iconPath: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z",
    },
    {
      label:    "WP Expiring",
      value:    data.wp_expiring,
      type:     "warning",
      iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    },
    {
      label:    "Passport Expiring",
      value:    data.passport_expiring,
      type:     "teal",
      iconPath: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
    },
    {
      label:    "Incomplete Profiles",
      value:    data.incomplete_profiles,
      type:     "orange",
      iconPath: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    },
  ];

  return (
    <div className="dashboard-shell">

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ══ SIDEBAR ══════════════════════════════════════ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="sidebar-brand-name">HR Portal</div>
          <div className="sidebar-brand-sub">Admin Dashboard</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          <button className="sidebar-link active">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </button>
          <button className="sidebar-link" onClick={() => navigate("/employees")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Employees
          </button>
          <button className="sidebar-link" onClick={() => navigate("/import")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Import Data
          </button>
          <button className="sidebar-link" onClick={() => navigate("/leave")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Leave Management
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              {/* backend returns username, not name */}
              <div className="sidebar-user-name">{user?.username || "Admin"}</div>
              <div className="sidebar-user-role">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Administrator"}
              </div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ══ MAIN ═════════════════════════════════════════ */}
      <div className="dashboard-main">

        {/* topbar */}
        <div className="dashboard-topbar">
          <div className="topbar-title">
            {division
              ? division === "all" ? "All Divisions" : division
              : "Dashboard"}
          </div>
          <div className="topbar-actions">

            {/* Division selector — populated from GET /divisions/ */}
            <select
              className="topbar-select"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              <option value="all">All Divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>

            {/* Quick import — full import experience → /import page */}
            <label className="topbar-upload-label" title="Quick import (or go to Import Data for full preview)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {loading ? "Importing…" : "Quick Import"}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </label>

            {/* Export — calls GET /export/?division=X */}
            <button
              className="topbar-btn secondary"
              onClick={handleExport}
              disabled={exportLoading}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {exportLoading ? "Exporting…" : "Export CSV"}
            </button>

            <button className="topbar-btn primary" onClick={() => navigate("/employees")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              View Employees
            </button>
          </div>
        </div>

        {/* content */}
        <div className="dashboard-content">
          <div className="dashboard-greeting">
            {/* username from backend login_view response */}
            <h2>Good day, {user?.username || "Admin"} 👋</h2>
            <p>
              Overview for{" "}
              <strong>{division === "all" ? "All Divisions" : division}</strong>
            </p>
          </div>

          {/* ── Stat cards ── */}
          <div className="cards-grid">
            {cards.map((card) => (
              <div
                key={card.label}
                className={`stat-card ${card.type} clickable`}
                onClick={() => handleCardClick(card.label)}
              >
                <div className="stat-card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.iconPath} />
                  </svg>
                </div>
                <div className="stat-card-label">{card.label}</div>
                <div className="stat-card-value">{card.value}</div>
              </div>
            ))}
          </div>

          {/* ── Charts ── */}
          <div className="charts-section">
            <h3 className="charts-title">Analytics Overview</h3>
            <div className="charts-grid">

              {/* Division Distribution — chart_division_distribution */}
              <div className="chart-card">
                <h4>Division Distribution</h4>
                <div className="chart-container">
                  {divisionChartData ? (
                    <Pie
                      data={divisionChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: { boxWidth: 12, font: { size: 11 } },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="chart-loading">Loading chart…</div>
                  )}
                </div>
              </div>

              {/* Monthly Growth — chart_monthly_growth */}
              <div className="chart-card">
                <h4>Monthly Growth (Last 12 Months)</h4>
                <div className="chart-container">
                  {monthlyGrowthData ? (
                    <Line
                      data={monthlyGrowthData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                        plugins: { legend: { display: false } },
                      }}
                    />
                  ) : (
                    <div className="chart-loading">Loading chart…</div>
                  )}
                </div>
              </div>

              {/* Designation Breakdown — chart_designation_breakdown */}
              <div className="chart-card">
                <h4>Designation Breakdown (Top 10)</h4>
                <div className="chart-container">
                  {designationChartData ? (
                    <Bar
                      data={designationChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { beginAtZero: true, ticks: { precision: 0 } },
                          x: { ticks: { font: { size: 10 } } },
                        },
                        plugins: { legend: { display: false } },
                      }}
                    />
                  ) : (
                    <div className="chart-loading">Loading chart…</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Loading overlay for quick import */}
          {loading && (
            <div className="loading-bar">
              <div className="loading-spinner" />
              Uploading and processing file…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;