import { useEffect, useState, useCallback } from "react";
import api from "../axiosInstance";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

// ── Icon helper ───────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
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

// ── Visual Skeleton Loader ─────────────────────────────────
function SkeletonLoader({ type }) {
  if (type === "card") {
    return (
      <div className="stat-card skeleton-card">
        <div className="skeleton skeleton-icon" />
        <div className="skeleton skeleton-label" />
        <div className="skeleton skeleton-value" />
      </div>
    );
  }
  if (type === "table") {
    return (
      <div className="skeleton-table">
        <div className="skeleton skeleton-th" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
      </div>
    );
  }
  return null;
}

// ── Premium UI Helpers ─────────────────────────────────────
const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const emptyStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "120px",
  color: "var(--grey-500)",
  fontSize: "0.875rem",
  textAlign: "center",
  padding: "1rem"
};



function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  // ── States ───────────────────────────────────────────────
  const [data, setData] = useState({
    summary: {
      total_employees:     0,
      active_employees:    0,
      inactive_employees:  0,
      wp_expiring:         0,
      passport_expiring:   0,
      ssic_gt_expiring:    0,
      incomplete_profiles: 0,
      total_documents:     0,
    },
    charts: {
      employee_growth: [],
      division_distribution: [],
      payroll_trend: {
        trend: [],
        average_payroll: 0,
        comparison: 0
      },
      attendance_summary: {
        present_count: 0,
        absent_count: 0,
        leave_count: 0,
        present_percentage: 0.0,
        absent_percentage: 0.0,
        leave_percentage: 0.0
      }
    },
    recent_activity: [],
    division_cards: []
  });

  const [division, setDivision] = useState(
    localStorage.getItem("selectedDivision") || "all"
  );
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const showToast = (message, type = "success") => setToast({ message, type });

  // ── Download Template CSV ──────────────────────────────
  const downloadTemplate = () => {
    const headers = [
      "EMP ID", "IS_ACTIVE", "COMPANY", "NAME", "EMAIL", "HP NUMBER", "NATIONALITY", "D.O.B",
      "QUALIFICATION", "IPA DESIGNATION", "Trade", "IPA SALARY", "PER HR", "DOA", "ARRIVAL DATE",
      "DATE JOINED", "IC / WP NO", "FIN NO", "IC TYPE", "ISSUANCE DATE", "S PASS/ WP EXPRIY",
      "PP.NO", "PP EXPIRY", "SSIC GT S/N", "SSIC GT EXP DATE", "SSIC HT S/N", "SSIC HT EXP DATE",
      "WORK-AT-HEIGHT", "CONFINED SPACE", "WELDER NO", "LSSC S/N", "SIGNALMAN & RIGGER COURSE",
      "BANK ACCOUNT NUMBER", "ACCOMODATION", "PCP STATUS", "REMARKS"
    ];
    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee_import_template.csv";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Template downloaded successfully", "success");
  };

  const getActivityIcon = (iconName = "") => {
    if (iconName === "import" || iconName === "success") {
      return {
        d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
        color: "#16a34a",
        bgClass: "success"
      };
    }
    if (iconName === "payroll" || iconName === "info") {
      return {
        d: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
        color: "var(--theme-600)",
        bgClass: "info"
      };
    }
    if (iconName === "invoice" || iconName === "warning") {
      return {
        d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
        color: "#ea580c",
        bgClass: "warning"
      };
    }
    return {
      d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2",
      color: "var(--theme-600)",
      bgClass: "theme"
    };
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "Recently";
    try {
      const diff = new Date() - new Date(timestamp);
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins} mins ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hours ago`;
      const days = Math.floor(hrs / 24);
      if (days === 1) return "Yesterday";
      return `${days} days ago`;
    } catch {
      return "Recently";
    }
  };

  // ── Dynamic Greeting ─────────────────────────────────────
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  // ── Guard: redirect if not logged in ─────────────────────
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    if (!u) navigate("/");
  }, [navigate]);

  // ── Persist division selection ────────────────────────────
  useEffect(() => {
    if (division) localStorage.setItem("selectedDivision", division);
  }, [division]);

  // ── API Fetchers ──────────────────────────────────────────
  const fetchDashboard = useCallback((div) => {
    setLoading(true);
    api.get(`dashboard/?division=${div}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error("Dashboard fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  // ── Trigger Fetches ───────────────────────────────────────
  useEffect(() => {
    if (!division) return;
    fetchDashboard(division);
  }, [division, fetchDashboard]);

  // Click-outside listener for Alerts Center and Profile Dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (alertsOpen && !e.target.closest(".notification-trigger")) {
        setAlertsOpen(false);
      }
      if (profileDropdownOpen && !e.target.closest(".profile-menu-trigger")) {
        setProfileDropdownOpen(false);
      }
      if (searchResults && !e.target.closest(".search-box-wrapper")) {
        setSearchResults(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [alertsOpen, profileDropdownOpen, searchResults]);

  // ── Quick search handler ──────────────────────────────────
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setSearchResults(null);
      navigate(`/employees?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // ── Smart Search Handlers ──────────────────────────────────
  const performSearch = async (val) => {
    if (!val.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const [resSearch, resDesignation, resDivision] = await Promise.all([
        api.get(`employees/?search=${encodeURIComponent(val)}&page_size=30`),
        api.get(`employees/?designation=${encodeURIComponent(val)}&page_size=30`),
        api.get(`employees/?division=${encodeURIComponent(val)}&page_size=30`)
      ]);
      
      const list1 = resSearch.data.results || [];
      const list2 = resDesignation.data.results || [];
      const list3 = resDivision.data.results || [];
      
      // Merge unique employees
      const seen = new Set();
      const uniqueEmployees = [];
      [...list1, ...list2, ...list3].forEach(emp => {
        if (!seen.has(emp.emp_id)) {
          seen.add(emp.emp_id);
          uniqueEmployees.push(emp);
        }
      });

      // Filter matched divisions
      const matchedDivs = (data?.division_cards || []).filter(d => 
        d.key !== "all" && d.label.toLowerCase().includes(val.toLowerCase())
      );

      // Generate document results for matched employees
      const docsResults = [];
      const lowerVal = val.toLowerCase();
      uniqueEmployees.forEach(emp => {
        if (lowerVal.includes("pass") || !lowerVal.includes("permit")) {
          docsResults.push({
            emp_id: emp.emp_id,
            emp_name: emp.name,
            doc_type: "passport",
            label: `${emp.name} — Passport.pdf`
          });
        }
        if (lowerVal.includes("permit") || lowerVal.includes("work") || !lowerVal.includes("passport")) {
          docsResults.push({
            emp_id: emp.emp_id,
            emp_name: emp.name,
            doc_type: "work_permit",
            label: `${emp.name} — Work Permit.pdf`
          });
        }
      });

      setSearchResults({
        employees: uniqueEmployees.slice(0, 5),
        documents: docsResults.slice(0, 5),
        divisions: matchedDivs
      });
    } catch (err) {
      console.error("Global search error:", err);
    }
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    performSearch(val);
  };

  // ── Quick upload / import ────────────────────────────────
  // eslint-disable-next-line no-unused-vars
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

    setLoading(true);
    try {
      const res = await api.post("import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast(`Import job submitted successfully. ID: ${res.data.job_id}`, "success");
      fetchDashboard(division);
    } catch (err) {
      showToast(err.response?.data?.error || "Import failed", "error");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // ── Export CSV ───────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = division && division !== "all" ? `?division=${division}` : "";
      const res = await api.get(`export/${params}`);
      const employees = res.data;

      if (!employees || employees.length === 0) {
        showToast("No employees found for this division", "error");
        return;
      }

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
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
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

  // ── Card Filter Navigation ────────────────────────────────
  const getCardFilter = (label) => {
    switch (label) {
      case "Total Employees":    return {};
      case "Active":             return { status: "active" };
      case "Inactive":           return { status: "inactive" };
      case "WP Expiring":        return { doc_type: "wp", days: "60" };
      case "Passport Expiring":  return { doc_type: "passport", days: "90" };
      case "SSIC GT Expiring":   return { doc_type: "ssic_gt", days: "60" };
      case "Incomplete Profiles":return { incomplete: "true" };
      default:                   return {};
    }
  };

  const handleCardClick = (label) => {
    const filters = getCardFilter(label);
    const params = new URLSearchParams({ division, ...filters });
    navigate(`/employees?${params.toString()}`);
  };

  // ── Chart coordinates & paths calculations ──────────────────
  const growth = data?.charts?.employee_growth || [];
  const points = [];
  let linePath = "";
  let fillPath = "";
  let latestMoM = 0;
  let growthBadgeText = "";
  
  if (growth.length > 0) {
    const xStart = 30;
    const xEnd = 280;
    const xStep = growth.length > 1 ? (xEnd - xStart) / (growth.length - 1) : 0;
    const yBottom = 100;
    const yTop = 20;
    const yHeight = yBottom - yTop;
    const cumulatives = growth.map(g => g.cumulative);
    const minVal = Math.min(...cumulatives, 0);
    const maxVal = Math.max(...cumulatives, 1);
    const range = maxVal - minVal;
    
    growth.forEach((g, idx) => {
      const x = xStart + idx * xStep;
      const y = yBottom - ((g.cumulative - minVal) / range) * yHeight;
      points.push({ x, y, cumulative: g.cumulative, month: g.month });
    });
    
    linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    fillPath = `${linePath} L ${points[points.length-1].x} 100 L ${points[0].x} 100 Z`;
    
    latestMoM = growth[growth.length - 1].growth_percentage;
    growthBadgeText = latestMoM >= 0 ? `+${latestMoM}% MoM` : `${latestMoM}% MoM`;
  }

  const distribution = data?.charts?.division_distribution || [];
  const colors = ["#4f46e5", "#10b981", "#f59e0b", "#06b6d4", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

  const payroll = data?.charts?.payroll_trend || {};
  const trend = payroll.trend || [];
  const averagePayroll = payroll.average_payroll || 0;
  
  let payrollPoints = [];
  if (trend.length > 0) {
    const values = trend.map(t => t.total_payroll);
    const maxVal = Math.max(...values, 1);
    
    trend.forEach((t, idx) => {
      const height = (t.total_payroll / maxVal) * 80;
      const y = 100 - height;
      const x = 42 + idx * 40;
      payrollPoints.push({ x, y, height, total_payroll: t.total_payroll, month: t.month });
    });
  }
  const payrollBadgeText = `Avg $${(averagePayroll / 1000).toFixed(0)}K`;

  const att = data?.charts?.attendance_summary || {};
  const presentCount = att.present_count || 0;
  const absentCount = att.absent_count || 0;
  const leaveCount = att.leave_count || 0;
  const presentPct = att.present_percentage || 0;
  const absentPct = att.absent_percentage || 0;
  const leavePct = att.leave_percentage || 0;

  // Helper for profile letters
  const getInitials = (name) => {
    return (name || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  return (
    <div className="dashboard-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <Sidebar />

      <main className="dashboard-main premium-dashboard">
        
        {/* ── 1. TOP HEADER ────────────────────────────────────────── */}
        <header className="premium-topbar">
          <div className="topbar-left">
            <div className="search-box-wrapper">
              <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={18} stroke="#64748b" />
              <input
                type="text"
                placeholder="Search employees, divisions, documents, IDs..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) performSearch(searchQuery); }}
                onKeyDown={handleSearchKeyDown}
                className="topbar-search-input"
              />

              {searchResults && (searchQuery.trim() !== "") && (
                <div className="search-dropdown-overlay" onClick={e => e.stopPropagation()}>
                  
                  {/* Category: Employees */}
                  {searchResults.employees.length > 0 && (
                    <div className="search-dropdown-group">
                      <div className="search-dropdown-group-title">Employees</div>
                      {searchResults.employees.map(emp => (
                        <button
                          key={emp.emp_id}
                          className="search-dropdown-item"
                          onClick={() => {
                            setSearchResults(null);
                            navigate(`/employees/${emp.emp_id}/profile`);
                          }}
                        >
                          <div className="search-dropdown-item-icon">👤</div>
                          <div className="search-dropdown-item-text">
                            <span className="search-dropdown-item-title">{emp.name}</span>
                            <span className="search-dropdown-item-sub">{emp.designation || "Staff"} · {emp.emp_id}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Category: Documents */}
                  {searchResults.documents.length > 0 && (
                    <div className="search-dropdown-group">
                      <div className="search-dropdown-group-title">Documents</div>
                      {searchResults.documents.map((doc, idx) => (
                        <button
                          key={idx}
                          className="search-dropdown-item"
                          onClick={() => {
                            setSearchResults(null);
                            navigate(`/documents?empId=${doc.emp_id}`);
                          }}
                        >
                          <div className="search-dropdown-item-icon">📄</div>
                          <div className="search-dropdown-item-text">
                            <span className="search-dropdown-item-title">{doc.label}</span>
                            <span className="search-dropdown-item-sub">{doc.emp_name} · {doc.emp_id}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Category: Divisions */}
                  {searchResults.divisions.length > 0 && (
                    <div className="search-dropdown-group">
                      <div className="search-dropdown-group-title">Divisions</div>
                      {searchResults.divisions.map(div => (
                        <button
                          key={div.key}
                          className="search-dropdown-item"
                          onClick={() => {
                            setSearchResults(null);
                            navigate(`/employees?division=${encodeURIComponent(div.label)}`);
                          }}
                        >
                          <div className="search-dropdown-item-icon">🏢</div>
                          <div className="search-dropdown-item-text">
                            <span className="search-dropdown-item-title">{div.label}</span>
                            <span className="search-dropdown-item-sub">Workforce Section</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.employees.length === 0 &&
                   searchResults.documents.length === 0 &&
                   searchResults.divisions.length === 0 && (
                    <div className="search-dropdown-empty">
                      No results found for "{searchQuery}"
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-dropdown-pill">
              <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={15} stroke="#4f46e5" />
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="topbar-division-select"
              >
                {(data?.division_cards || []).map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
              <Icon d="M19 9l-7 7-7-7" size={12} stroke="#64748b" />
            </div>
            
            {(() => {
              const alertsList = [
                { text: `${data?.summary?.passport_expiring || 0} passports expiring in 90 days`, type: 'passport', link: '/employees?expiry_alert=passport&days=90' },
                { text: `${data?.summary?.wp_expiring || 0} work permits expiring in 60 days`, type: 'wp', link: '/employees?expiry_alert=wp&days=60' },
                { text: `${data?.summary?.incomplete_profiles || 0} incomplete profiles`, type: 'incomplete', link: '/employees?incomplete=true' },
                { text: "Payroll processing pending", type: 'payroll', link: '/payroll' },
                { text: "2 failed document uploads", type: 'upload', link: '/employees' }
              ];
              return (
                <div className="notification-trigger" title="Alerts Center" onClick={() => setAlertsOpen(!alertsOpen)}>
                  <Icon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" size={18} stroke="#4f46e5" />
                  <span className="notification-badge">{alertsList.length}</span>

                  {alertsOpen && (
                    <div className="alerts-dropdown-panel" onClick={(e) => e.stopPropagation()}>
                      <div className="alerts-panel-header">
                        <h4>Alerts ({alertsList.length})</h4>
                        <button className="close-panel-btn" onClick={() => setAlertsOpen(false)}>×</button>
                      </div>
                      <ul className="alerts-panel-list">
                        {alertsList.map((alert, idx) => (
                          <li key={idx} className={`alerts-panel-item ${alert.type}`} onClick={() => { navigate(alert.link); setAlertsOpen(false); }}>
                            <span className="alert-bullet">•</span>
                            <span className="alert-text">{alert.text}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="alerts-panel-footer">
                        <button className="view-all-alerts-btn" onClick={() => { navigate("/employees?incomplete=true"); setAlertsOpen(false); }}>
                          View All Alerts &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Profile Dropdown */}
            <div className="profile-menu-trigger" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
              <div className="profile-avatar-circle">
                {getInitials(user?.username || "Aathithiyan Sir")}
                <span className="profile-dot" />
              </div>

              {profileDropdownOpen && (
                <div className="profile-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <div className="profile-dropdown-user-info">
                    <strong>{toTitleCase(user?.username || "Aathithiyan Sir")}</strong>
                    <span>{user?.role === "admin" ? "Super Admin" : "HR Specialist"}</span>
                  </div>
                  <button className="profile-dropdown-item" onClick={() => { navigate("/change-password"); setProfileDropdownOpen(false); }}>
                    <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={14} /> Change Password
                  </button>
                  <hr className="profile-dropdown-divider" />
                  <button className="profile-dropdown-item logout" onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/");
                  }}>
                    <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          
          {/* ── 2. WELCOME SECTION ───────────────────────────────────── */}
          <div className="welcome-hero-section">
            <div className="welcome-hero-content">
              <h2>{getGreeting()}, Admin 👋</h2>
              <div className="welcome-hero-stats">
                <span className="welcome-stat-badge">
                  <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={13} stroke="var(--theme-600)" />
                  {data.total_employees} Employees
                </span>
                <span className="welcome-stat-badge">
                  <Icon d="M3 21h18M3 7h18M3 14h18" size={13} stroke="var(--theme-600)" />
                  {data?.division_cards ? (data.division_cards.length - 1) : 0} Divisions
                </span>
                <span className={`welcome-stat-badge ${((data?.summary?.passport_expiring || 0) + (data?.summary?.wp_expiring || 0) + (data?.summary?.ssic_gt_expiring || 0)) > 0 ? "alert-critical" : ""}`}>
                  <Icon d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" size={13} stroke={((data?.summary?.passport_expiring || 0) + (data?.summary?.wp_expiring || 0) + (data?.summary?.ssic_gt_expiring || 0)) > 0 ? "#dc2626" : "var(--theme-600)"} />
                  {((data?.summary?.passport_expiring || 0) + (data?.summary?.wp_expiring || 0) + (data?.summary?.ssic_gt_expiring || 0))} Critical Alerts
                </span>
              </div>
            </div>
            <div className="welcome-hero-actions">
              <button className="hero-btn primary" onClick={() => navigate("/import")}>
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={14} stroke="var(--white)" />
                Import Employees
              </button>
              <button className="hero-btn secondary" onClick={downloadTemplate}>
                <Icon d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" size={14} stroke="var(--theme-600)" />
                Download Template
              </button>
            </div>
          </div>

          {/* ── 3. TOP DIVISIONS SECTION ────────────────────────────── */}
          <section className="divisions-deck-section">
            <div className="section-head">
              <h3>Top Divisions</h3>
              <button className="section-text-link" onClick={() => navigate("/employees")}>View all divisions &rarr;</button>
            </div>
            <div className="divisions-horizontal-scroll">
              {(data?.division_cards || []).map((divCard) => {
                const isActive = division === divCard.key;
                return (
                  <div
                    key={divCard.key}
                    onClick={() => setDivision(divCard.key)}
                    className={`division-deck-card ${divCard.bgClass} ${isActive ? "active" : ""}`}
                  >
                    <div className="div-card-head">
                      <div className="div-icon-wrapper" style={{ backgroundColor: `${divCard.color}15`, color: divCard.color }}>
                        <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={16} />
                      </div>
                      <span className="div-emp-badge">{divCard.count} Employees</span>
                    </div>
                    <h4 className="div-card-title">{divCard.label}</h4>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 4. KPI METRIC CARDS ──────────────────────────────────── */}
          <section className="metrics-grid-section">
            {loading ? (
              Array.from({ length: 8 }).map((_, idx) => <SkeletonLoader key={idx} type="card" />)
            ) : (
              <>
                <div className="stat-card premium-card total clickable" onClick={() => handleCardClick("Total Employees")}>
                  <div className="stat-icon-wrapper blue">
                    <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#3b82f6" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-card-label">Total Employees</span>
                    <h3 className="stat-card-value">{data?.summary?.total_employees || 0}</h3>
                    <span className="stat-sub-detail text-blue">Direct DB query</span>
                  </div>
                </div>

                <div className="stat-card premium-card success clickable" onClick={() => handleCardClick("Active")}>
                  <div className="stat-icon-wrapper green">
                    <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#10b981" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-card-label">Active Employees</span>
                    <h3 className="stat-card-value">{data?.summary?.active_employees || 0}</h3>
                    <span className="stat-sub-detail text-green">
                      {data?.summary?.total_employees > 0 ? ((data.summary.active_employees / data.summary.total_employees) * 100).toFixed(1) : 0}% of total
                    </span>
                  </div>
                </div>

                <div className="stat-card premium-card danger clickable" onClick={() => handleCardClick("Inactive")}>
                  <div className="stat-icon-wrapper red">
                    <Icon d="M18.36 18.36A9 9 0 115.64 5.64m12.72 12.72A9 9 0 115.64 5.64" stroke="#ef4444" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-card-label">Inactive Employees</span>
                    <h3 className="stat-card-value">{data?.summary?.inactive_employees || 0}</h3>
                    <span className="stat-sub-detail text-red">
                      {data?.summary?.total_employees > 0 ? ((data.summary.inactive_employees / data.summary.total_employees) * 100).toFixed(1) : 0}% of total
                    </span>
                  </div>
                </div>

                <div className="stat-card premium-card orange clickable" onClick={() => handleCardClick("Incomplete Profiles")}>
                  <div className="stat-icon-wrapper orange">
                    <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#f59e0b" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-card-label">Incomplete Profiles</span>
                    <h3 className="stat-card-value">{data?.summary?.incomplete_profiles || 0}</h3>
                    <span className="stat-sub-detail text-orange">
                      {data?.summary?.total_employees > 0 ? ((data.summary.incomplete_profiles / data.summary.total_employees) * 100).toFixed(1) : 0}% action needed
                    </span>
                  </div>
                </div>

                <div className="stat-card premium-card sky clickable" onClick={() => handleCardClick("Passport Expiring")}>
                  <div className="stat-icon-wrapper sky">
                    <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#06b6d4" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-card-label">Passport Expiring</span>
                    <h3 className="stat-card-value">{data?.summary?.passport_expiring || 0}</h3>
                    <span className="stat-sub-detail text-sky">Within 90 days</span>
                  </div>
                </div>

                <div className="stat-card premium-card warning clickable" onClick={() => handleCardClick("WP Expiring")}>
                  <div className="stat-icon-wrapper warning">
                    <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#ea580c" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-card-label">Work Permit Expiring</span>
                    <h3 className="stat-card-value">{data?.summary?.wp_expiring || 0}</h3>
                    <span className="stat-sub-detail text-warning">Within 60 days</span>
                  </div>
                </div>

                <div className="stat-card premium-card violet clickable" onClick={() => handleCardClick("SSIC GT Expiring")}>
                  <div className="stat-icon-wrapper violet">
                    <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="#8b5cf6" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-card-label">SSIC / ID Expiring</span>
                    <h3 className="stat-card-value">{data?.summary?.ssic_gt_expiring || 0}</h3>
                    <span className="stat-sub-detail text-violet">Within 60 days</span>
                  </div>
                </div>

                <div className="stat-card premium-card grey clickable" onClick={() => navigate("/documents")}>
                  <div className="stat-icon-wrapper grey">
                    <Icon d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" stroke="#64748b" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-card-label">Total Documents</span>
                    <h3 className="stat-card-value">{data?.summary?.total_documents || 0}</h3>
                    <span className="stat-sub-detail text-grey">Tracked in database</span>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ── 5. PRIORITY ALERT SECTION ────────────────────────────── */}
          <section className="alerts-deck-section">
            <div className="section-head">
              <h3>Priority Action Required</h3>
            </div>
            <div className="alerts-grid">
              <div className="alert-strip-card danger clickable" onClick={() => navigate("/employees?incomplete=true")}>
                <div className="alert-icon-circle">
                  <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={18} stroke="#dc2626" />
                </div>
                <div className="alert-strip-body">
                  <div className="alert-strip-title">{data?.summary?.incomplete_profiles || 0} Incomplete Profiles</div>
                  <div className="alert-strip-subtitle">Action required</div>
                </div>
                <div className="alert-strip-arrow">
                  <Icon d="M9 5l7 7-7 7" size={14} stroke="#dc2626" />
                </div>
              </div>

              <div className="alert-strip-card warning clickable" onClick={() => navigate("/employees?expiry_alert=passport&days=90")}>
                <div className="alert-icon-circle">
                  <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={18} stroke="#d97706" />
                </div>
                <div className="alert-strip-body">
                  <div className="alert-strip-title">{data?.summary?.passport_expiring || 0} Passports Expiring</div>
                  <div className="alert-strip-subtitle">Within 90 days</div>
                </div>
                <div className="alert-strip-arrow">
                  <Icon d="M9 5l7 7-7 7" size={14} stroke="#d97706" />
                </div>
              </div>

              <div className="alert-strip-card info clickable" onClick={() => navigate("/employees?expiry_alert=wp&days=60")}>
                <div className="alert-icon-circle">
                  <Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={18} stroke="#2563eb" />
                </div>
                <div className="alert-strip-body">
                  <div className="alert-strip-title">{data?.summary?.wp_expiring || 0} Work Permits Expiring</div>
                  <div className="alert-strip-subtitle">Within 60 days</div>
                </div>
                <div className="alert-strip-arrow">
                  <Icon d="M9 5l7 7-7 7" size={14} stroke="#2563eb" />
                </div>
              </div>

              <div className="alert-strip-card purple clickable" onClick={() => navigate("/employees?expiry_alert=ssic&days=60")}>
                <div className="alert-icon-circle">
                  <Icon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" size={18} stroke="#7c3aed" />
                </div>
                <div className="alert-strip-body">
                  <div className="alert-strip-title">{data?.summary?.ssic_gt_expiring || 0} SSIC / ID Expiring</div>
                  <div className="alert-strip-subtitle">Within 60 days</div>
                </div>
                <div className="alert-strip-arrow">
                  <Icon d="M9 5l7 7-7 7" size={14} stroke="#7c3aed" />
                </div>
              </div>

              <div className="alert-strip-card view-all clickable" onClick={() => navigate("/employees?incomplete=true")}>
                <span className="view-all-text">View All Alerts</span>
                <span className="view-all-arrow">
                  <Icon d="M9 5l7 7-7 7" size={14} stroke="#4f46e5" />
                </span>
              </div>
            </div>
          </section>

          {/* ── 6. INSIGHTS SECTION (CHARTS & ACTIVITIES) ────────────────────── */}
          <section className="insights-grid-section">
            <div className="insights-left-col">
              <div className="section-head">
                <h3>Workforce Insights</h3>
              </div>
              
              {loading ? (
                <div className="charts-grid">
                  <SkeletonLoader key="c1" type="card" />
                  <SkeletonLoader key="c2" type="card" />
                  <SkeletonLoader key="c3" type="card" />
                  <SkeletonLoader key="c4" type="card" />
                </div>
              ) : (
                <div className="charts-grid">
                  
                  {/* Chart 1: Employee Growth */}
                  <div className="premium-table-card chart-card">
                    <div className="chart-card-header">
                      <span className="chart-title">Employee Growth</span>
                      {growth.length > 0 && (
                        <span className={`chart-badge ${latestMoM >= 0 ? "positive" : "negative"}`}>
                          {growthBadgeText}
                        </span>
                      )}
                    </div>
                    <div className="chart-content">
                      {growth.length > 0 ? (
                        <svg viewBox="0 0 300 120" className="chart-svg">
                          <defs>
                            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--theme-500)" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="var(--theme-500)" stopOpacity="0.00" />
                            </linearGradient>
                          </defs>
                          <line x1="30" y1="20" x2="280" y2="20" stroke="var(--grey-200)" strokeDasharray="3,3" />
                          <line x1="30" y1="50" x2="280" y2="50" stroke="var(--grey-200)" strokeDasharray="3,3" />
                          <line x1="30" y1="80" x2="280" y2="80" stroke="var(--grey-200)" strokeDasharray="3,3" />
                          <line x1="30" y1="100" x2="280" y2="100" stroke="var(--grey-300)" />
                          
                          {fillPath && <path d={fillPath} fill="url(#growthGrad)" />}
                          {linePath && <path d={linePath} fill="none" stroke="var(--theme-600)" strokeWidth="3" />}
                          
                          {points.map((p, idx) => (
                            <circle key={idx} cx={p.x} cy={p.y} r="4" fill="var(--white)" stroke="var(--theme-600)" strokeWidth="2" />
                          ))}
                          
                          {points.map((p, idx) => (
                            <text key={idx} x={p.x} y="115" textAnchor="middle" className="chart-axis-text">
                              {p.month.split(' ')[0]}
                            </text>
                          ))}
                        </svg>
                      ) : (
                        <div style={emptyStyle}>No employee records available.</div>
                      )}
                    </div>
                  </div>

                  {/* Chart 2: Division Distribution */}
                  <div className="premium-table-card chart-card">
                    <div className="chart-card-header">
                      <span className="chart-title">Division Distribution</span>
                      <span className="chart-badge">Active</span>
                    </div>
                    {distribution.length > 0 ? (
                      <div className="chart-content doughnut-layout">
                        <svg viewBox="0 0 100 100" className="chart-doughnut-svg">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--grey-100)" strokeWidth="12" />
                          {(() => {
                            let accum = 0;
                            return distribution.map((d, idx) => {
                              const fraction = d.percentage / 100;
                              const strokeDasharray = `${(fraction * 251.3).toFixed(1)} 251.3`;
                              const strokeDashoffset = -(accum * 251.3).toFixed(1);
                              accum += fraction;
                              const color = colors[idx % colors.length];
                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="none"
                                  stroke={color}
                                  strokeWidth="12"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  transform="rotate(-90 50 50)"
                                />
                              );
                            });
                          })()}
                          
                          <text x="50" y="52" textAnchor="middle" className="doughnut-center-title">
                            {data?.summary?.total_employees || 0}
                          </text>
                          <text x="50" y="64" textAnchor="middle" className="doughnut-center-subtitle">Staff</text>
                        </svg>
                        
                        <div className="doughnut-legends-list">
                          {distribution.map((d, idx) => {
                            const color = colors[idx % colors.length];
                            return (
                              <div key={idx} className="legend-item">
                                <span className="legend-dot" style={{ backgroundColor: color }} />
                                <span>{d.division}: {d.percentage}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="chart-content">
                        <div style={emptyStyle}>No division data available.</div>
                      </div>
                    )}
                  </div>

                  {/* Chart 3: Payroll Trend */}
                  <div className="premium-table-card chart-card">
                    <div className="chart-card-header">
                      <span className="chart-title">Payroll Trend</span>
                      {trend.length > 0 && (
                        <span className="chart-badge">{payrollBadgeText}</span>
                      )}
                    </div>
                    <div className="chart-content">
                      {trend.length > 0 ? (
                        <svg viewBox="0 0 300 120" className="chart-svg">
                          <line x1="30" y1="20" x2="280" y2="20" stroke="var(--grey-200)" strokeDasharray="3,3" />
                          <line x1="30" y1="50" x2="280" y2="50" stroke="var(--grey-200)" strokeDasharray="3,3" />
                          <line x1="30" y1="80" x2="280" y2="80" stroke="var(--grey-200)" strokeDasharray="3,3" />
                          <line x1="30" y1="100" x2="280" y2="100" stroke="var(--grey-300)" />
                          
                          {payrollPoints.map((p, idx) => (
                            <rect
                              key={idx}
                              x={p.x}
                              y={p.y}
                              width="16"
                              height={p.height}
                              rx="3"
                              fill={idx >= trend.length - 2 ? "var(--theme-600)" : "var(--theme-400)"}
                            />
                          ))}
                          
                          {payrollPoints.map((p, idx) => (
                            <text key={idx} x={p.x + 8} y="115" textAnchor="middle" className="chart-axis-text">
                              {p.month.split(' ')[0]}
                            </text>
                          ))}
                        </svg>
                      ) : (
                        <div style={emptyStyle}>No payroll history available.</div>
                      )}
                    </div>
                  </div>

                  {/* Chart 4: Attendance Summary */}
                  <div className="premium-table-card chart-card">
                    <div className="chart-card-header">
                      <span className="chart-title">Attendance Summary</span>
                      {(presentCount > 0 || absentCount > 0) && (
                        <span className="chart-badge positive">{presentPct}% Present</span>
                      )}
                    </div>
                    <div className="chart-content attendance-layout">
                      {(presentCount > 0 || absentCount > 0) ? (
                        <>
                          <div className="attendance-bar-container">
                            <div className="attendance-label-row">
                              <span className="att-title">Today's Attendance</span>
                              <span className="att-pct">{presentPct}%</span>
                            </div>
                            <div className="attendance-stacked-bar">
                              <div className="attendance-segment present" style={{ width: `${presentPct}%` }} title={`Present: ${presentPct}%`} />
                              <div className="attendance-segment leave" style={{ width: `${leavePct}%` }} title={`On Leave: ${leavePct}%`} />
                              <div className="attendance-segment absent" style={{ width: `${absentPct}%` }} title={`Absent: ${absentPct}%`} />
                            </div>
                          </div>
                          
                          <div className="attendance-stats-legend">
                            <div className="att-legend-item">
                              <div className="att-legend-bullet present" />
                              <div className="att-legend-info">
                                <span className="att-legend-name">Present</span>
                                <span className="att-legend-val">{presentCount} staff</span>
                              </div>
                            </div>
                            <div className="att-legend-item">
                              <div className="att-legend-bullet leave" />
                              <div className="att-legend-info">
                                <span className="att-legend-name">On Leave</span>
                                <span className="att-legend-val">{leaveCount} staff</span>
                              </div>
                            </div>
                            <div className="att-legend-item">
                              <div className="att-legend-bullet absent" />
                              <div className="att-legend-info">
                                <span className="att-legend-name">Absent</span>
                                <span className="att-legend-val">{absentCount} staff</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={emptyStyle}>No attendance data available.</div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
            
            {/* Right Column: Recent Activity Feed */}
            <div className="insights-right-col">
              <div className="section-head">
                <h3>Recent Activity</h3>
              </div>
              <div className="premium-table-card activity-card">
                {loading ? (
                  <div className="activity-loading">
                    <div className="loader-ring" />
                    <span>Loading recent activity...</span>
                  </div>
                ) : (data?.recent_activity || []).length > 0 ? (
                  <>
                    <div className="activity-pulse-header">
                      <span className="live-pulse"><span className="pulse-circle"></span> Live Feed</span>
                      <span className="activity-count">{(data?.recent_activity || []).length} events</span>
                    </div>
                    
                    <div className="activity-timeline">
                      {data.recent_activity.map((act) => {
                        const iconData = getActivityIcon(act.icon);
                        return (
                          <div key={act.id} className="timeline-item">
                            <div className={`timeline-icon-wrap ${iconData.bgClass}`}>
                              <Icon d={iconData.d} size={12} stroke={iconData.color} />
                            </div>
                            <div className="timeline-content">
                              <p className="timeline-text">
                                <strong>{act.title}</strong>: {act.description}
                              </p>
                              <span className="timeline-time">{formatRelativeTime(act.created_at)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="activity-empty-state">
                    <div className="activity-empty-icon">🔔</div>
                    <h5 className="activity-empty-title">No recent activity yet</h5>
                    <p className="activity-empty-text">
                      No recent activity.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Upload progress indicator */}
          {loading && (
            <div className="floating-loader-strip">
              <div className="loader-ring" />
              <span>Processing Excel Upload...</span>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default Dashboard;