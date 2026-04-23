import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

// ── tiny icon helpers ─────────────────────────────────────
const Icon = ({ d, size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

function Dashboard() {
  const [data, setData] = useState({
    total_employees: 0, active_employees: 0,
    inactive_employees: 0, wp_expiring: 0, passport_expiring: 0,
  });
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ── Fetch divisions ──────────────────────────────────────
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/divisions/")
      .then(res => {
        setDivisions(res.data);
        if (res.data.length > 0) setDivision(res.data[0].name);
      })
      .catch(err => console.log(err));
  }, []);

  // ── Fetch dashboard data ─────────────────────────────────
  const fetchData = (div) => {
    if (!div) return;
    axios.get(`http://127.0.0.1:8000/api/dashboard/?division=${div}`)
      .then(res => setData(res.data))
      .catch(err => console.log(err));
  };

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    if (!u) { navigate("/"); return; }
    if (division) fetchData(division);
  }, [division, navigate]);

  // ── Logout ───────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  // ── File upload ──────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/import/", formData);
      alert(`✅ Upload Success\nCreated: ${res.data.created}\nUpdated: ${res.data.updated}\nInactivated: ${res.data.inactivated}`);
      fetchData(division);
    } catch (err) {
      console.log(err);
      alert("❌ Upload Failed");
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.name || "A").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

  const cards = [
    { label: "Total Employees",    value: data.total_employees,    type: "total",   iconPath: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
    { label: "Active",             value: data.active_employees,   type: "success", iconPath: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" },
    { label: "Inactive",           value: data.inactive_employees, type: "danger",  iconPath: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" },
    { label: "WP Expiring",        value: data.wp_expiring,        type: "warning", iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { label: "Passport Expiring",  value: data.passport_expiring,  type: "teal",    iconPath: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
  ];

  return (
    <div className="dashboard-shell">

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
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
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
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || "Admin"}</div>
              <div className="sidebar-user-role">Administrator</div>
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
          <div className="topbar-title">{division || "Dashboard"}</div>
          <div className="topbar-actions">

            <select
              className="topbar-select"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>

            <label className="topbar-upload-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import Excel
              <input type="file" onChange={handleFileUpload} />
            </label>

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
            <h2>Good day, {user?.name || "Admin"} 👋</h2>
            <p>Here's an overview for <strong>{division}</strong> division</p>
          </div>

          {/* stat cards */}
          <div className="cards-grid">
            {cards.map((card) => (
              <div key={card.label} className={`stat-card ${card.type}`}>
                <div className="stat-card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.iconPath} />
                  </svg>
                </div>
                <div className="stat-card-label">{card.label}</div>
                <div className="stat-card-value">{card.value}</div>
              </div>
            ))}
          </div>

          {loading && (
            <div className="loading-bar">
              <div className="loading-spinner" />
              Uploading and processing file...
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Dashboard;