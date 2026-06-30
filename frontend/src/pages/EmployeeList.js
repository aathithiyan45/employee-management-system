import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosInstance";
import Toast from "../components/Toast.js";
import Sidebar from "../components/Sidebar";
import "./EmployeeList.css";

// ── Icon helper ───────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const getInitialsColor = (name) => {
  if (!name) return "#4f46e5";
  const colors = [
    "#4f46e5", "#0284c7", "#0d9488", "#16a34a", 
    "#ca8a04", "#ea580c", "#dc2626", "#7c3aed", "#db2777"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getPhotoUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseUrl = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api/";
  const host = baseUrl.replace(/\/api\/?$/, "");
  return `${host}${url}`;
};

function EmployeeList() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(false);
  // Initialize division from localStorage, URL params, or default to "all"
  const [division, setDivision] = useState(
    new URLSearchParams(window.location.search).get("division") ||
      localStorage.getItem("selectedEmployeeListDivision") ||
      "all",
  );
  const [divisions, setDivisions] = useState([]);
  const urlParams = new URLSearchParams(window.location.search);
  const [status, setStatus] = useState(urlParams.get("status") || "");
  const [search, setSearch] = useState("");
  // Removed debouncedSearch

  // ── New filter states ──────────────────────────────────
  const [designation, setDesignation] = useState("");
  const [nationality, setNationality] = useState("");
  const [docType, setDocType] = useState(urlParams.get("doc_type") || urlParams.get("expiry_alert") || "");
  const [expiryDays, setExpiryDays] = useState(urlParams.get("days") || "60");
  const [tempDocType, setTempDocType] = useState(urlParams.get("doc_type") || urlParams.get("expiry_alert") || "");
  const [tempExpiryDays, setTempExpiryDays] = useState(urlParams.get("days") || "60");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [incomplete, setIncomplete] = useState(urlParams.get("incomplete") || "");
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    alerts: 0,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Get user info on mount
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
  }, []);

  // ── Dynamic KPI metrics calculation ────────────────────────
  const updateMetrics = useCallback(() => {
    const hasOtherFilters = !!(
      status ||
      search ||
      designation ||
      nationality ||
      docType ||
      joinedFrom ||
      joinedTo ||
      incomplete
    );

    if (!hasOtherFilters) {
      api.get(`dashboard/?division=${division || "all"}`)
        .then((res) => {
          const d = res.data;
          setMetrics({
            total: d.total_employees || 0,
            active: d.active_employees || 0,
            inactive: d.inactive_employees || 0,
            alerts: (d.incomplete_profiles || 0) + (d.passport_expiring || 0) + (d.wp_expiring || 0) + (d.ssic_gt_expiring || 0),
          });
        })
        .catch((err) => console.error("Error loading metrics:", err));
    } else {
      api.get("employees/", {
        params: {
          division,
          status,
          search,
          designation,
          nationality,
          doc_type: docType,
          days: expiryDays,
          joined_from: joinedFrom,
          joined_to: joinedTo,
          incomplete,
          page: 1,
          page_size: 100, // get up to 100 to compute dynamic values
        }
      })
      .then((res) => {
        const results = res.data.results || res.data;
        const totalCount = res.data.count || results.length;
        
        let activeCount = 0;
        let inactiveCount = 0;
        let alertsCount = 0;
        
        const today = new Date();
        const next60 = new Date();
        next60.setDate(today.getDate() + 60);
        const next90 = new Date();
        next90.setDate(today.getDate() + 90);
        
        results.forEach((e) => {
          if (e.status === "Active") {
            activeCount++;
          } else {
            inactiveCount++;
          }
          
          const hasPassportAlert = e.passport_expiry && new Date(e.passport_expiry) <= next90 && new Date(e.passport_expiry) >= today;
          const hasWpAlert = e.wp_expiry && new Date(e.wp_expiry) <= next60 && new Date(e.wp_expiry) >= today;
          const isIncomplete = !e.phone;
          
          if (hasPassportAlert || hasWpAlert || isIncomplete) {
            alertsCount++;
          }
        });
        
        setMetrics({
          total: totalCount,
          active: status === "active" ? totalCount : (status === "inactive" ? 0 : activeCount),
          inactive: status === "inactive" ? totalCount : (status === "active" ? 0 : inactiveCount),
          alerts: alertsCount,
        });
      })
      .catch((err) => console.error("Error calculating metrics:", err));
    }
  }, [division, status, search, designation, nationality, docType, expiryDays, joinedFrom, joinedTo, incomplete]);

  useEffect(() => {
    updateMetrics();
  }, [updateMetrics]);

  // ── Parse URL parameters on mount ──────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const divisionParam = urlParams.get("division");
    const statusParam = urlParams.get("status");
    const docTypeParam = urlParams.get("doc_type") || urlParams.get("expiry_alert");
    const daysParam = urlParams.get("days");
    const incompleteParam = urlParams.get("incomplete");

    // Set division from URL or default to "all"
    if (divisionParam) setDivision(divisionParam);
    if (statusParam) setStatus(statusParam);
    if (docTypeParam) {
      setDocType(docTypeParam);
      setTempDocType(docTypeParam);
    }
    if (daysParam) {
      setExpiryDays(daysParam);
      setTempExpiryDays(daysParam);
    }
    if (incompleteParam) setIncomplete(incompleteParam);
  }, []);

  // ── Edit Employee States ──────────────────────────────────
  // Removed editEmployee and formData states - now using profile page

  // ── Fetch Employees Function ─────────────────────────────
  const fetchEmployees = useCallback(() => {
    // Allow "all" divisions or specific division names
    if (!division) return;
    setLoading(true);
    api
      .get("employees/", {
        params: {
          division,
          status,
          search: search,
          designation,
          nationality,
          doc_type: docType,
          days: expiryDays,
          joined_from: joinedFrom,
          joined_to: joinedTo,
          incomplete,
          page: currentPage,
          page_size: pageSize,
        },
      })
      .then((res) => {
        setEmployees(res.data.results || res.data);
        setTotalEmployees(res.data.count || res.data.length);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching employees:", err);
        setLoading(false);
      });
  }, [
    division,
    status,
    search,
    designation,
    nationality,
    docType,
    expiryDays,
    joinedFrom,
    joinedTo,
    incomplete,
    currentPage,
    pageSize,
  ]);

  // ── Handle Employee Deletion ───────────────────────────
  const deleteEmployee = (empId, empName) => {
    setDeleteTarget({ id: empId, name: empName });
  };

  const confirmDeleteEmployee = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`employees/${deleteTarget.id}/`);
      // Refresh the employee list
      fetchEmployees();
      showToast("Employee deleted successfully");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      showToast("Failed to delete employee. Please try again.", "error");
    }
  };

  // ── Fetch Divisions ────────────────────────────────────
  useEffect(() => {
    api
      .get("divisions/")
      .then((res) => {
        setDivisions(res.data);
      })
      .catch((err) => console.error("Error fetching divisions:", err));
  }, []);

  // ── Save selected division to localStorage ────────────────
  useEffect(() => {
    if (division) {
      localStorage.setItem("selectedEmployeeListDivision", division);
    }
  }, [division]);

  // ── Fetch Employees ────────────────────────────────────
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const hasActiveFilters = !!(
    (division && division !== "all") ||
    status ||
    search ||
    designation ||
    nationality ||
    docType ||
    joinedFrom ||
    joinedTo ||
    incomplete
  );

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setDesignation("");
    setNationality("");
    setDocType("");
    setTempDocType("");
    setExpiryDays("60");
    setTempExpiryDays("60");
    setJoinedFrom("");
    setJoinedTo("");
    setIncomplete("");
    setDivision("all");
    setCurrentPage(1);
  };
  
  const applyExpiryFilter = () => {
    setDocType(tempDocType);
    setExpiryDays(tempExpiryDays);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalEmployees / pageSize);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main employee-page">
      {/* ── HEADER ────────────────────────────────────── */}
      <div className="employee-header-block">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="header-title-wrapper">
            <h1>Employee List</h1>
            <p className="header-subtitle">
              Manage employee profiles, track contract expiries, and edit work divisions.
            </p>
          </div>
        </div>
      </div>

      {/* ── SEARCH & PRIMARY ACTIONS ────────────────────── */}
      <div className="search-actions-row">
        <div className="search-wrapper-wide">
          <span className="search-icon">
            <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" size={16} stroke="var(--grey-400)" />
          </span>
          <input
            type="text"
            placeholder="Search by ID, Name, WP, FIN or SSIC..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input-wide"
          />
        </div>
        <div className="primary-actions">
          <button className="btn-primary-saas" onClick={() => navigate("/import")}>
            <Icon d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" size={16} stroke="white" />
            Import Employees
          </button>
        </div>
      </div>

      {/* ── FILTER BAR ─────────────────────────────────── */}
      <div className="filter-bar-container">
        <div className="quick-filters-row">
          <div className="quick-filters-left">
            <div className="filter-select-wrapper">
              <span className="filter-select-label">Division</span>
              <select
                value={division}
                onChange={(e) => {
                  setDivision(e.target.value);
                  setCurrentPage(1);
                }}
                className="saas-filter-select"
              >
                <option value="all">All Divisions</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrapper">
              <span className="filter-select-label">Status</span>
              <select 
                value={status} 
                onChange={(e) => {
                  setStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="saas-filter-select"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <button 
              className={`advanced-toggle-btn ${showAdvanced ? "active" : ""}`}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Icon d={showAdvanced ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} size={14} stroke="var(--grey-600)" />
              {showAdvanced ? "Hide Advanced Filters" : "Advanced Filters"}
            </button>
          </div>

          <div className="quick-filters-right">
            {hasActiveFilters && (
              <button className="clear-filters-btn-saas" onClick={clearFilters}>
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Collapsible Advanced Filters ── */}
        {showAdvanced && (
          <div className="advanced-filters-panel">
            <div className="advanced-filters-grid">
              
              <div className="advanced-filter-item">
                <label>Designation</label>
                <input
                  type="text"
                  placeholder="Filter designation..."
                  value={designation}
                  onChange={(e) => {
                    setDesignation(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="saas-filter-input"
                />
              </div>

              <div className="advanced-filter-item">
                <label>Nationality</label>
                <input
                  type="text"
                  placeholder="Filter nationality..."
                  value={nationality}
                  onChange={(e) => {
                    setNationality(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="saas-filter-input"
                />
              </div>

              <div className="advanced-filter-item expiry-group">
                <label>Document Expiry</label>
                <div className="saas-expiry-filter-group">
                  <select
                    value={tempDocType}
                    onChange={(e) => setTempDocType(e.target.value)}
                    className="saas-expiry-select"
                  >
                    <option value="">All Documents</option>
                    <option value="wp">Work Permit</option>
                    <option value="passport">Passport</option>
                    <option value="ssic_gt">SSIC GT</option>
                    <option value="ssic_ht">SSIC HT</option>
                    <option value="security_bond">Security Bond</option>
                  </select>
                  <div className="saas-expiry-days">
                    <span>in</span>
                    <input
                      type="number"
                      value={tempExpiryDays}
                      onChange={(e) => setTempExpiryDays(e.target.value)}
                      className="saas-expiry-input"
                      min="1"
                    />
                    <span>days</span>
                  </div>
                  <button className="apply-expiry-btn-saas" onClick={applyExpiryFilter}>
                    Apply
                  </button>
                </div>
              </div>

              <div className="advanced-filter-item date-range-group">
                <label>Date Joined Range</label>
                <div className="saas-date-range-group">
                  <input
                    type="date"
                    value={joinedFrom}
                    onChange={(e) => {
                      setJoinedFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                    title="Joined From"
                  />
                  <span className="date-range-sep">—</span>
                  <input
                    type="date"
                    value={joinedTo}
                    onChange={(e) => {
                      setJoinedTo(e.target.value);
                      setCurrentPage(1);
                    }}
                    title="Joined To"
                  />
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ── KPI Metrics Deck ────────────────────────────── */}
      <section className="summary-deck-section">
        <div className="summary-deck-grid">
          
          {/* Card 1: Total Employees */}
          <div 
            onClick={() => {
              setStatus("");
              setIncomplete("");
              setDocType("");
              setExpiryDays("60");
              setTempDocType("");
              setTempExpiryDays("60");
              setCurrentPage(1);
            }}
            className={`saas-summary-card clickable ${!status && !incomplete && !docType ? "active-filter" : ""}`}
          >
            <div className="saas-summary-content">
              <span className="saas-summary-label">Total Employees</span>
              <h3 className="saas-summary-value">{metrics.total}</h3>
            </div>
            <div className="saas-summary-icon-circle blue">
              <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={18} stroke="var(--theme-600)" />
            </div>
          </div>

          {/* Card 2: Active Employees */}
          <div 
            onClick={() => {
              setStatus("active");
              setIncomplete("");
              setDocType("");
              setExpiryDays("60");
              setTempDocType("");
              setTempExpiryDays("60");
              setCurrentPage(1);
            }}
            className={`saas-summary-card clickable ${status === "active" && !incomplete && !docType ? "active-filter" : ""}`}
          >
            <div className="saas-summary-content">
              <span className="saas-summary-label">Active Employees</span>
              <h3 className="saas-summary-value">{metrics.active}</h3>
            </div>
            <div className="saas-summary-icon-circle green">
              <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={18} stroke="#10b981" />
            </div>
          </div>

          {/* Card 3: Inactive Employees */}
          <div 
            onClick={() => {
              setStatus("inactive");
              setIncomplete("");
              setDocType("");
              setExpiryDays("60");
              setTempDocType("");
              setTempExpiryDays("60");
              setCurrentPage(1);
            }}
            className={`saas-summary-card clickable ${status === "inactive" && !incomplete && !docType ? "active-filter" : ""}`}
          >
            <div className="saas-summary-content">
              <span className="saas-summary-label">Inactive Employees</span>
              <h3 className="saas-summary-value">{metrics.inactive}</h3>
            </div>
            <div className="saas-summary-icon-circle red">
              <Icon d="M18.36 18.36A9 9 0 115.64 5.64m12.72 12.72A9 9 0 115.64 5.64" size={18} stroke="#ef4444" />
            </div>
          </div>

          {/* Card 4: Critical Alerts */}
          <div 
            onClick={() => {
              setStatus("");
              setIncomplete("true");
              setDocType("");
              setExpiryDays("60");
              setTempDocType("");
              setTempExpiryDays("60");
              setCurrentPage(1);
            }}
            className={`saas-summary-card clickable ${incomplete === "true" ? "active-filter" : ""}`}
          >
            <div className="saas-summary-content">
              <span className="saas-summary-label">Action Required Alerts</span>
              <h3 className="saas-summary-value">{metrics.alerts}</h3>
            </div>
            <div className="saas-summary-icon-circle amber">
              <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={18} stroke="#d97706" />
            </div>
          </div>

        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="stats-bar">
        <span className="stats-text">
          Showing {employees.length} of {totalEmployees} employees
        </span>
      </div>

      {/* ── TABLE ─────────────────────────────────────── */}
      <div className="table-wrapper">
        <table className="employee-table">
          <thead className="sticky-header">
            <tr>
              <th className="text-left">EMP ID</th>
              <th className="text-left">Name</th>
              <th className="text-center">Phone</th>
              <th className="text-left">Designation</th>
              <th className="text-left">Division</th>
              <th className="text-center">Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Premium Skeleton Loader
              Array.from({ length: pageSize }, (_, i) => (
                <tr key={i} className="skeleton-row">
                  <td>
                    <div className="skeleton skeleton-chip"></div>
                  </td>
                  <td>
                    <div className="skeleton skeleton-text"></div>
                  </td>
                  <td>
                    <div className="skeleton skeleton-text"></div>
                  </td>
                  <td>
                    <div className="skeleton skeleton-text"></div>
                  </td>
                  <td>
                    <div className="skeleton skeleton-text"></div>
                  </td>
                  <td>
                    <div className="skeleton skeleton-pill"></div>
                  </td>
                  <td>
                    <div className="skeleton skeleton-actions"></div>
                  </td>
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state-card-saas">
                    <div className="empty-state-icon-saas">
                      <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={32} stroke="var(--grey-400)" />
                    </div>
                    <h4>No employees match your filters.</h4>
                    <p>Adjust your search queries, reset your active status and divisions, or upload a new registry file.</p>
                    <div className="empty-state-actions">
                      <button className="empty-state-btn-clear" onClick={clearFilters}>
                        Clear Filters
                      </button>
                      <button className="empty-state-btn-import" onClick={() => navigate("/import")}>
                        Import Employees
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              employees.map((e, index) => (
                <tr
                  key={e.emp_id}
                  className={index % 2 === 0 ? "even-row" : "odd-row"}
                  onClick={() => navigate(`/employees/${e.emp_id}`)}
                >
                  <td className="text-left">
                    <span
                      className="emp-id-badge"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        navigate(`/employees/${e.emp_id}`);
                      }}
                    >
                      {e.emp_id}
                    </span>
                  </td>
                  <td className="text-left">
                    <div className="employee-table-cell-profile">
                      {e.profile_photo ? (
                        <img src={getPhotoUrl(e.profile_photo)} alt={e.name} className="employee-table-avatar" />
                      ) : (
                        <div 
                          className="employee-table-avatar initials" 
                          style={{ backgroundColor: getInitialsColor(e.name) }}
                        >
                          {e.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <strong>{e.name}</strong>
                    </div>
                  </td>
                  <td className="text-center">{e.phone || "—"}</td>
                  <td className="text-left">{e.designation_ipa || e.designation || "—"}</td>
                  <td className="text-left">{e.division}</td>
                  <td className="text-center">
                    <span
                      className={`status-pill ${e.status?.toLowerCase() === "active" ? "active" : "inactive"}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="action-buttons">
                      <button
                        className="edit-btn"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          navigate(`/employees/${e.emp_id}/profile`);
                        }}
                      >
                        Edit
                      </button>
                      {user?.role === "admin" && (
                        <button
                          className="delete-btn-small"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            deleteEmployee(e.emp_id, e.name);
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ‹ Prev
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next ›
          </button>
        </div>
      )}

      {deleteTarget && (
        <div className="custom-confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="custom-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon">
              <Icon d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" size={30} stroke="#ef4444" />
            </div>
            <h3>Delete Employee</h3>
            <p>
              Are you sure you want to delete employee <strong>{deleteTarget.name} ({deleteTarget.id})</strong>?
              This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn cancel" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="confirm-btn confirm" onClick={() => {
                confirmDeleteEmployee();
              }}>
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      </main>
    </div>
  );
}

export default EmployeeList;
