import { useEffect, useState } from "react";
import api from "../axiosInstance";
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

// Register Chart.js components
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

// ── tiny icon helpers ─────────────────────────────────────
const Icon = ({ d, size = 17 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

function Dashboard() {
  const [data, setData] = useState({
    total_employees: 0,
    active_employees: 0,
    inactive_employees: 0,
    wp_expiring: 0,
    passport_expiring: 0,
    incomplete_profiles: 0,
  });
  // Initialize division from localStorage or empty string
  const [division, setDivision] = useState(
    localStorage.getItem("selectedDivision") || "",
  );
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Chart data states
  const [divisionChartData, setDivisionChartData] = useState(null);
  const [monthlyGrowthData, setMonthlyGrowthData] = useState(null);
  const [designationChartData, setDesignationChartData] = useState(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ── Fetch divisions ──────────────────────────────────────
  useEffect(() => {
    api
      .get("divisions/")
      .then((res) => {
        setDivisions(res.data);
        // Only set default division if not already in localStorage
        if (!division && res.data.length > 0) {
          const defaultDiv = res.data[0].name;
          setDivision(defaultDiv);
          localStorage.setItem("selectedDivision", defaultDiv);
        }
      })
      .catch((err) => console.log(err));
  }, [division]);

  // ── Fetch dashboard data ─────────────────────────────────
  const fetchData = (div) => {
    if (!div) return;
    api
      .get(`dashboard/?division=${div}`)
      .then((res) => setData(res.data))
      .catch((err) => console.log(err));
  };

  // ── Fetch chart data ─────────────────────────────────────
  const fetchChartData = (selectedDivision) => {
    // Division distribution
    api
      .get(`charts/division-distribution/?division=${selectedDivision}`)
      .then((res) => setDivisionChartData(res.data))
      .catch((err) => console.log("Division chart error:", err));

    // Monthly growth
    api
      .get(`charts/monthly-growth/?division=${selectedDivision}`)
      .then((res) => setMonthlyGrowthData(res.data))
      .catch((err) => console.log("Monthly growth chart error:", err));

    // Designation breakdown
    api
      .get(`charts/designation-breakdown/?division=${selectedDivision}`)
      .then((res) => setDesignationChartData(res.data))
      .catch((err) => console.log("Designation chart error:", err));
  };

  // ── Save selected division to localStorage ────────────────
  useEffect(() => {
    if (division) {
      localStorage.setItem("selectedDivision", division);
    }
  }, [division]);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    if (!u) {
      navigate("/");
      return;
    }
    if (division) {
      fetchData(division);
      fetchChartData(division);
    }
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
      const res = await api.post("import/", formData);
      alert(
        `✅ Upload Success\nCreated: ${res.data.created}\nUpdated: ${res.data.updated}\nInactivated: ${res.data.inactivated}`,
      );
      fetchData(division);
    } catch (err) {
      console.log(err);
      alert("❌ Upload Failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Export employees ─────────────────────────────────────
  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await api.get("employees/", {
        params: {
          division: division === "all" ? undefined : division,
          page_size: 99999, // Get all employees
        },
        responseType: "json",
      });

      const employees = response.data.results || response.data;

      // Create CSV content
      const headers = [
        "EMP ID",
        "Name",
        "Phone",
        "Designation",
        "Division",
        "Status",
        "Salary",
      ];
      const rows = employees.map((e) => [
        e.emp_id,
        e.name,
        e.phone || "",
        e.designation || "",
        e.division || "",
        e.status || "",
        e.salary || "",
      ]);

      let csvContent = headers.join(",") + "\n";
      rows.forEach((row) => {
        csvContent += row.map((cell) => `"${cell}"`).join(",") + "\n";
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `employees_${division}_${new Date().getTime()}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setLoading(false);
    } catch (err) {
      console.log(err);
      alert("❌ Export Failed");
      setLoading(false);
    }
  };

  const initials = (user?.name || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const cards = [
    {
      label: "Total Employees",
      value: data.total_employees,
      type: "total",
      iconPath:
        "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    },
    {
      label: "Active",
      value: data.active_employees,
      type: "success",
      iconPath: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
    },
    {
      label: "Inactive",
      value: data.inactive_employees,
      type: "danger",
      iconPath:
        "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z",
    },
    {
      label: "WP Expiring",
      value: data.wp_expiring,
      type: "warning",
      iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    },
    {
      label: "Passport Expiring",
      value: data.passport_expiring,
      type: "teal",
      iconPath:
        "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
    },
    {
      label: "Incomplete Profiles",
      value: data.incomplete_profiles,
      type: "orange",
      iconPath: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    },
  ];

  return (
    <div className="dashboard-shell">
      {/* ══ SIDEBAR ══════════════════════════════════════ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="sidebar-brand-name">HR Portal</div>
          <div className="sidebar-brand-sub">Admin Dashboard</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>

          <button className="sidebar-link active">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate("/employees")}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Employees
          </button>
          <button className="sidebar-link" onClick={() => navigate("/import")}>
            {/* upload icon */}
            Import Data
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
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
              <option value="all">All Divisions</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            <label className="topbar-upload-label">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import Excel
              <input type="file" onChange={handleFileUpload} />
            </label>

            <button
              className="topbar-btn secondary"
              onClick={handleExport}
              disabled={loading}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>

            <button
              className="topbar-btn primary"
              onClick={() => navigate("/employees")}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              View Employees
            </button>
          </div>
        </div>

        {/* content */}
        <div className="dashboard-content">
          <div className="dashboard-greeting">
            <h2>Good day, {user?.name || "Admin"} 👋</h2>
            <p>
              Here's an overview for <strong>{division}</strong> division
            </p>
          </div>

          {/* stat cards */}
          <div className="cards-grid">
            {cards.map((card) => {
              const getCardFilter = (label) => {
                switch (label) {
                  case "Total Employees":
                    return {};
                  case "Active":
                    return { status: "active" };
                  case "Inactive":
                    return { status: "inactive" };
                  case "WP Expiring":
                    return { expiry_alert: "wp" };
                  case "Passport Expiring":
                    return { expiry_alert: "passport" };
                  case "Incomplete Profiles":
                    return { incomplete: "true" };
                  default:
                    return {};
                }
              };

              const handleCardClick = () => {
                const filters = getCardFilter(card.label);
                const params = new URLSearchParams({
                  division,
                  ...filters,
                });
                navigate(`/employees?${params.toString()}`);
              };

              return (
                <div
                  key={card.label}
                  className={`stat-card ${card.type} clickable`}
                  onClick={handleCardClick}
                  style={{ cursor: "pointer" }}
                >
                  <div className="stat-card-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={card.iconPath} />
                    </svg>
                  </div>
                  <div className="stat-card-label">{card.label}</div>
                  <div className="stat-card-value">{card.value}</div>
                </div>
              );
            })}
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            <h3 className="charts-title">Analytics Overview</h3>
            <div className="charts-grid">
              {/* Division Distribution Chart */}
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
                            labels: {
                              boxWidth: 12,
                              font: { size: 11 },
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="chart-loading">Loading chart...</div>
                  )}
                </div>
              </div>

              {/* Monthly Growth Chart */}
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
                          y: {
                            beginAtZero: true,
                            ticks: { precision: 0 },
                          },
                        },
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  ) : (
                    <div className="chart-loading">Loading chart...</div>
                  )}
                </div>
              </div>

              {/* Designation Breakdown Chart */}
              <div className="chart-card">
                <h4>Designation Breakdown</h4>
                <div className="chart-container">
                  {designationChartData ? (
                    <Bar
                      data={designationChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { precision: 0 },
                          },
                        },
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  ) : (
                    <div className="chart-loading">Loading chart...</div>
                  )}
                </div>
              </div>
            </div>
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
