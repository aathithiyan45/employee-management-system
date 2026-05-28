import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Toast from "../components/Toast";
import api from "../axiosInstance";
import "./MyProfile.css";

// ── Icon helper ───────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none", className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

function MyProfile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  const [toast, setToast] = useState(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [data, setData] = useState({
    passport_expiring: 5,
    wp_expiring: 3,
    incomplete_profiles: 310,
  });

  // Preferences card state variables
  const [prefTheme, setPrefTheme] = useState("Light");
  const [prefDivision, setPrefDivision] = useState("All Divisions");
  const [prefDateFormat, setPrefDateFormat] = useState("DD MMM YYYY");
  const [prefTimeFormat, setPrefTimeFormat] = useState("12 Hour");
  const [prefEmailNotifications, setPrefEmailNotifications] = useState(true);
  const [prefExpiryAlerts, setPrefExpiryAlerts] = useState(true);

  const showToast = (message, type = "success") => setToast({ message, type });

  // Get dynamic alert count values from dashboard endpoint
  useEffect(() => {
    api.get("dashboard/?division=all")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => console.error("Error fetching notification counts:", err));
  }, []);

  // Click outside handlers
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (alertsOpen && !e.target.closest(".notification-trigger")) {
        setAlertsOpen(false);
      }
      if (profileDropdownOpen && !e.target.closest(".profile-menu-trigger")) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [alertsOpen, profileDropdownOpen]);

  // eslint-disable-next-line no-unused-vars
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleLogoutAllDevices = () => {
    showToast("Successfully logged out of all other active sessions.", "success");
  };

  const getInitials = (name) => {
    return (name || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  // eslint-disable-next-line no-unused-vars
  const displayRole = user.role === "admin" ? "Super Admin" : user.role === "hr" ? "HR Specialist" : "Employee";

  const alertsList = [
    { text: `${data.passport_expiring || 5} passports expiring in 90 days`, type: 'passport', link: '/employees?expiry_alert=passport&days=90' },
    { text: `${data.wp_expiring || 3} work permits expiring in 60 days`, type: 'wp', link: '/employees?expiry_alert=wp&days=60' },
    { text: `${data.incomplete_profiles || 310} incomplete profiles`, type: 'incomplete', link: '/employees?incomplete=true' },
    { text: "Payroll processing pending", type: 'payroll', link: '/payroll' },
    { text: "2 failed document uploads", type: 'upload', link: '/employees' }
  ];

  return (
    <div className="dashboard-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <Sidebar />

      <main className="dashboard-main premium-dashboard">
        
        {/* ── TOPBAR ────────────────────────────────────────── */}
        <header className="premium-topbar">
          <div className="topbar-left">
            <h2 className="topbar-page-title">Profile Settings</h2>
            <div className="topbar-breadcrumb">Dashboard &rsaquo; Profile Settings</div>
          </div>
          <div className="topbar-right">
            
            {/* Search Input Bar (Mocked from UI screenshot) */}
            <div className="topbar-search-bar">
              <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0" size={16} stroke="#64748b" />
              <input type="text" placeholder="Search employees, documents, divisions..." disabled />
              <span className="search-hotkey">&#8984; K</span>
            </div>

            {/* Division dropdown mock from UI */}
            <div className="topbar-div-dropdown">
              <Icon d="M3 21h18M3 7h18M3 14h18" size={15} stroke="#64748b" />
              <span>All Divisions</span>
              <Icon d="M19 9l-7 7-7-7" size={12} stroke="#64748b" />
            </div>
            
            {/* Alerts Bell */}
            <div className="notification-trigger" title="Alerts Center" onClick={() => setAlertsOpen(!alertsOpen)}>
              <Icon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" size={18} stroke="#475569" />
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

            {/* Profile Dropdown */}
            <div className="profile-menu-trigger" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
              <div className="profile-avatar-circle">
                {getInitials(user?.username || "Admin")}
                <span className="profile-dot" />
              </div>
              <div className="profile-topbar-user-info">
                <span className="profile-topbar-name">Admin</span>
                <span className="profile-topbar-role">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* ── PROFILE PAGE CONTENT ─────────────────────────────────── */}
        <div className="dashboard-content profile-page-content-wrapper">
          
          {/* 1. Header Card */}
          <div className="profile-header-card">
            <div className="profile-header-left">
              <div className="profile-avatar-container">
                <div className="profile-avatar-large">
                  AD
                </div>
                <span className="profile-avatar-status-dot" />
              </div>
              <div className="profile-header-info">
                <div className="profile-name-row">
                  <h2>Admin</h2>
                  <span className="profile-badge-role">Super Admin</span>
                </div>
                <div className="profile-header-contact-new">
                  <span className="profile-header-company">Workforce Management System</span>
                  <div className="profile-header-contact-row">
                    <span className="contact-item">
                      <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" size={13} stroke="#64748b" />
                      admin@workforce.com
                    </span>
                    <span className="contact-item">
                      <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" size={13} stroke="#64748b" />
                      +91 98765 43210
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="profile-header-stats-card">
              <div className="stat-box-new">
                <span className="stat-label-new">Employee ID</span>
                <span className="stat-value-new">EMP001</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-box-new">
                <span className="stat-label-new">Department</span>
                <span className="stat-value-new">Management</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-box-new">
                <span className="stat-label-new">Account Created</span>
                <span className="stat-value-new">Apr 15, 2025</span>
              </div>
            </div>
          </div>

          {/* 2. core Dashboard Grid System */}
          <div className="profile-grid-new">
            
            {/* Column 1: Personal Information */}
            <div className="profile-grid-card">
              <div className="profile-card-header-new">
                <div className="card-title-left-new">
                  <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={18} stroke="#3b82f6" />
                  <h3>Personal Information</h3>
                </div>
                <button className="profile-btn-outline" onClick={() => showToast("Edit Profile features coming soon!", "info")}>
                  <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={12} stroke="#3b82f6" style={{ marginRight: "4px" }} />
                  Edit
                </button>
              </div>
              <div className="profile-info-list-new">
                <div className="info-row-new">
                  <span className="info-icon-label">
                    <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={15} stroke="#64748b" />
                    Full Name
                  </span>
                  <span className="info-value-new">Admin</span>
                </div>
                <div className="info-row-new">
                  <span className="info-icon-label">
                    <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" size={15} stroke="#64748b" />
                    Email Address
                  </span>
                  <span className="info-value-new">admin@workforce.com</span>
                </div>
                <div className="info-row-new">
                  <span className="info-icon-label">
                    <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" size={15} stroke="#64748b" />
                    Phone Number
                  </span>
                  <span className="info-value-new">+91 98765 43210</span>
                </div>
                <div className="info-row-new">
                  <span className="info-icon-label">
                    <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={15} stroke="#64748b" />
                    Role
                  </span>
                  <span className="info-value-new">
                    <span className="role-badge-new">Super Admin</span>
                  </span>
                </div>
                <div className="info-row-new">
                  <span className="info-icon-label">
                    <Icon d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z M10 4h4v3h-4V4z" size={15} stroke="#64748b" />
                    Department
                  </span>
                  <span className="info-value-new">Management</span>
                </div>
                <div className="info-row-new">
                  <span className="info-icon-label">
                    <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM16 10h2M16 14h2 M6 8h6v8H6z" size={15} stroke="#64748b" />
                    Employee ID
                  </span>
                  <span className="info-value-new">EMP001</span>
                </div>
                <div className="info-row-new">
                  <span className="info-icon-label">
                    <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" size={15} stroke="#64748b" />
                    Time Zone
                  </span>
                  <span className="info-value-new">(UTC +05:30) Asia/Kolkata</span>
                </div>
                <div className="info-row-new borderless">
                  <span className="info-icon-label">
                    <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.66 0 3 3.58 3 8s-1.34 8-3 8-3-3.58-3-8 1.34-8 3-8z M2 12h20" size={15} stroke="#64748b" />
                    Language
                  </span>
                  <span className="info-value-new">English</span>
                </div>
              </div>
            </div>

            {/* Column 2: Account Security */}
            <div className="profile-grid-card">
              <div className="profile-card-header-new borderless">
                <div className="card-title-left-new">
                  <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={18} stroke="#3b82f6" />
                  <h3>Account Security</h3>
                </div>
              </div>
              <div className="security-card-inner-box">
                <span className="security-box-label">Password last changed</span>
                <span className="security-box-val">May 05, 2025 • 10:15 AM</span>
              </div>
              <div className="security-buttons-row">
                <button className="security-btn outline-blue" onClick={() => navigate("/change-password")}>
                  <Icon d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" size={14} stroke="#4f46e5" style={{ marginRight: "6px" }} />
                  Change Password
                </button>
                <button className="security-btn outline-red" onClick={handleLogoutAllDevices}>
                  <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={14} stroke="#ef4444" style={{ marginRight: "6px" }} />
                  Logout All Devices
                </button>
              </div>
              <div className="profile-info-list-new">
                <div className="info-row-new">
                  <span className="info-label-desc">Last Login</span>
                  <span className="info-value-new">May 28, 2026 • 09:42 AM</span>
                </div>
                <div className="info-row-new">
                  <span className="info-label-desc">Login IP</span>
                  <span className="info-value-new">103.112.45.67</span>
                </div>
                <div className="info-row-new">
                  <span className="info-label-desc">Browser / Device</span>
                  <span className="info-value-new">Chrome on macOS</span>
                </div>
                <div className="info-row-new borderless">
                  <span className="info-label-desc">Active Session</span>
                  <span className="session-badge active">Active</span>
                </div>
              </div>
            </div>

            {/* Column 3: Permissions & Access */}
            <div className="profile-grid-card">
              <div className="profile-card-header-new">
                <div className="card-title-left-new">
                  <Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={18} stroke="#3b82f6" />
                  <h3>Permissions & Access</h3>
                </div>
                <button className="profile-btn-outline view-all" onClick={() => showToast("Showing all permissions details.", "info")}>
                  View All
                </button>
              </div>
              <div className="permissions-list-new">
                {[
                  "Employee Management",
                  "Attendance & Leave Records",
                  "Documents Management",
                  "Payroll Management",
                  "Import / Export Data",
                  "Reports & Analytics",
                  "Audit Logs",
                  "System Settings",
                  "User & Role Management"
                ].map((perm, idx) => (
                  <div key={idx} className="permission-row-new">
                    <div className="permission-left-new">
                      <span className="permission-check-icon">
                        <span className="check-mini">&#10003;</span>
                      </span>
                      <span className="permission-name-new">{perm}</span>
                    </div>
                    <span className="permission-value-badge">Full Access</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 2, Column 1: Recent Activities */}
            <div className="profile-grid-card">
              <div className="profile-card-header-new">
                <div className="card-title-left-new">
                  <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size={18} stroke="#3b82f6" />
                  <h3>Recent Activities</h3>
                </div>
                <button className="profile-text-btn-blue" onClick={() => showToast("Navigating to comprehensive audit logs.", "info")}>
                  View All
                </button>
              </div>
              <div className="activities-list-new">
                {[
                  { text: "Added new employee - Ramesh Kumar", subtitle: "May 28, 2026 • 09:25 AM", color: "green", icon: "user-add" },
                  { text: "Updated passport details - Arun Joseph", subtitle: "May 27, 2026 • 04:45 PM", color: "blue", icon: "doc" },
                  { text: "Imported employee data (employees_may.csv)", subtitle: "May 27, 2026 • 02:30 PM", color: "orange", icon: "import" },
                  { text: "Processed payroll - May 2026", subtitle: "May 26, 2026 • 11:15 AM", color: "purple", icon: "payroll" },
                  { text: "Marked leave - 2 employees", subtitle: "May 26, 2026 • 09:10 AM", color: "red", icon: "leave" }
                ].map((act, idx) => (
                  <div key={idx} className="activity-row-new">
                    <div className={`activity-icon-badge-new ${act.color}`}>
                      {act.icon === "user-add" && <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={13} stroke="#16a34a" />}
                      {act.icon === "doc" && <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" size={13} stroke="#3b82f6" />}
                      {act.icon === "import" && <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={13} stroke="#ea580c" />}
                      {act.icon === "payroll" && <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h7a3.5 3.5 0 0 1 0 7H6" size={13} stroke="#7c3aed" />}
                      {act.icon === "leave" && <Icon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18" size={13} stroke="#dc2626" />}
                    </div>
                    <div className="activity-info-text-new">
                      <span className="activity-title-new">{act.text}</span>
                      <span className="activity-time-new">{act.subtitle}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 2, Column 2: Preferences */}
            <div className="profile-grid-card">
              <div className="profile-card-header-new">
                <div className="card-title-left-new">
                  <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" size={18} stroke="#3b82f6" />
                  <h3>Preferences</h3>
                </div>
              </div>
              <div className="preferences-form-new">
                <div className="pref-field-row">
                  <span className="pref-field-label">Theme</span>
                  <select 
                    value={prefTheme} 
                    onChange={(e) => {
                      setPrefTheme(e.target.value);
                      showToast(`Theme updated to ${e.target.value}`, "success");
                    }} 
                    className="pref-select-new"
                  >
                    <option value="Light">Light</option>
                    <option value="Dark">Dark</option>
                    <option value="System">System</option>
                  </select>
                </div>
                <div className="pref-field-row">
                  <span className="pref-field-label">Default Division Filter</span>
                  <select 
                    value={prefDivision} 
                    onChange={(e) => {
                      setPrefDivision(e.target.value);
                      showToast(`Default division filter updated to ${e.target.value}`, "success");
                    }} 
                    className="pref-select-new"
                  >
                    <option value="All Divisions">All Divisions</option>
                    <option value="PDS Marine">PDS Marine</option>
                    <option value="PDS Offshore">PDS Offshore</option>
                    <option value="PDS Engineering">PDS Engineering</option>
                  </select>
                </div>
                <div className="pref-field-row">
                  <span className="pref-field-label">Date Format</span>
                  <select 
                    value={prefDateFormat} 
                    onChange={(e) => {
                      setPrefDateFormat(e.target.value);
                      showToast(`Date format updated to ${e.target.value}`, "success");
                    }} 
                    className="pref-select-new"
                  >
                    <option value="DD MMM YYYY">DD MMM YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="pref-field-row">
                  <span className="pref-field-label">Time Format</span>
                  <select 
                    value={prefTimeFormat} 
                    onChange={(e) => {
                      setPrefTimeFormat(e.target.value);
                      showToast(`Time format updated to ${e.target.value}`, "success");
                    }} 
                    className="pref-select-new"
                  >
                    <option value="12 Hour">12 Hour</option>
                    <option value="24 Hour">24 Hour</option>
                  </select>
                </div>
                <div className="pref-field-row">
                  <span className="pref-field-label">Email Notifications</span>
                  <label className="switch-ios-new">
                    <input 
                      type="checkbox" 
                      checked={prefEmailNotifications} 
                      onChange={(e) => {
                        setPrefEmailNotifications(e.target.checked);
                        showToast(`Email notifications turned ${e.target.checked ? "On" : "Off"}`, "success");
                      }} 
                    />
                    <span className="slider-ios-new" />
                  </label>
                </div>
                <div className="pref-field-row borderless">
                  <span className="pref-field-label">Document Expiry Alerts</span>
                  <label className="switch-ios-new">
                    <input 
                      type="checkbox" 
                      checked={prefExpiryAlerts} 
                      onChange={(e) => {
                        setPrefExpiryAlerts(e.target.checked);
                        showToast(`Document expiry alerts turned ${e.target.checked ? "On" : "Off"}`, "success");
                      }} 
                    />
                    <span className="slider-ios-new" />
                  </label>
                </div>
              </div>
            </div>

            {/* Row 2, Column 3: Session Information */}
            <div className="profile-grid-card">
              <div className="profile-card-header-new">
                <div className="card-title-left-new">
                  <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={18} stroke="#3b82f6" />
                  <h3>Session Information</h3>
                </div>
              </div>
              <div className="session-current-section">
                <div className="current-session-title-row">
                  <span className="current-lbl">Current Session</span>
                  <span className="session-badge active">Active</span>
                </div>
                <div className="current-session-details">
                  <div className="session-detail-row">
                    <span className="session-detail-lbl">Login Time</span>
                    <span className="session-detail-val">May 28, 2026 • 09:42 AM</span>
                  </div>
                  <div className="session-detail-row">
                    <span className="session-detail-lbl">IP Address</span>
                    <span className="session-detail-val">103.112.45.67</span>
                  </div>
                  <div className="session-detail-row borderless">
                    <span className="session-detail-lbl">Device</span>
                    <span className="session-detail-val">macOS • Chrome 126.0</span>
                  </div>
                </div>
              </div>
              <div className="session-recent-section">
                <span className="recent-sessions-header">Recent Sessions</span>
                <div className="recent-sessions-table-wrapper">
                  <table className="recent-sessions-table">
                    <tbody>
                      {[
                        { time: "May 27, 2026 • 06:20 PM", ip: "103.112.45.67", status: "Successful" },
                        { time: "May 26, 2026 • 08:15 AM", ip: "103.112.45.67", status: "Successful" },
                        { time: "May 25, 2026 • 07:05 PM", ip: "203.89.67.21", status: "Successful" }
                      ].map((sess, idx) => (
                        <tr key={idx}>
                          <td>{sess.time}</td>
                          <td>{sess.ip}</td>
                          <td className="text-right">
                            <span className="session-badge success-pill">{sess.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Footer Accent */}
          <footer className="profile-page-footer">
            <span className="footer-copyright">© 2026 Workforce Management System. All rights reserved.</span>
            <span className="footer-version">v1.0.0</span>
          </footer>

        </div>
      </main>
    </div>
  );
}

export default MyProfile;
