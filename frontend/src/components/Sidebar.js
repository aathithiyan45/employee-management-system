import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../axiosInstance";

// ── Icons ─────────────────────────────────────────────────
const Icon = ({ d, size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ── Nav link definitions per role ─────────────────────────
const ADMIN_NAV = [
  {
    label: "Main",
    links: [
      { path: "/dashboard", label: "Dashboard",       icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
      { path: "/employees", label: "Employees",       icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
      { path: "/import",    label: "Import Data",     icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" },
      { path: "/leave",     label: "Leave Management",icon: "M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" },
    ],
  },
];

const HR_NAV = [
  {
    label: "Main",
    links: [
      { path: "/hr/dashboard", label: "HR Dashboard",    icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
      { path: "/leave",        label: "Leave Approvals", icon: "M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18" },
      { path: "/employees",    label: "Employees",       icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
    ],
  },
];

const EMPLOYEE_NAV = [
  {
    label: "Main",
    links: [
      { path: "/employee/dashboard", label: "Dashboard", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
      { path: "/profile",            label: "My Profile", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
    ],
  },
];

const NAV_BY_ROLE = { admin: ADMIN_NAV, hr: HR_NAV, employee: EMPLOYEE_NAV };
const SUBTITLE_BY_ROLE = { admin: "Admin Dashboard", hr: "HR Portal", employee: "Employee Portal" };

// ── Sidebar ───────────────────────────────────────────────
function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = JSON.parse(localStorage.getItem("user") || "{}");
  const role      = user?.role || "employee";
  const initials  = (user?.username || "U").slice(0, 2).toUpperCase();
  const sections  = NAV_BY_ROLE[role] || EMPLOYEE_NAV;
  const subtitle  = SUBTITLE_BY_ROLE[role] || "Portal";

  // logout() calls POST /api/logout/ to blacklist the refresh token on the
  // server before clearing localStorage — prevents token replay after sign-out.
  const handleLogout = () => logout();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div className="sidebar-brand-name">HR <span style={{ color: "var(--teal-400)" }}>Portal</span></div>
        <div className="sidebar-brand-sub">{subtitle}</div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.links.map(link => {
              const active = location.pathname === link.path ||
                (link.path !== "/" && location.pathname.startsWith(link.path));
              return (
                <button
                  key={link.path}
                  className={`sidebar-link${active ? " active" : ""}`}
                  onClick={() => navigate(link.path)}
                >
                  <Icon d={link.icon} />
                  {link.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.username || "User"}</div>
            <div className="sidebar-user-role">
              {role.charAt(0).toUpperCase() + role.slice(1)}
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
  );
}

export default Sidebar;