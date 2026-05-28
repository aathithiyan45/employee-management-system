import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosInstance";
import Toast from "../components/Toast.js";
import "./EmployeeList.css";

// ── Icon helper ───────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

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
  const [alertCounts, setAlertCounts] = useState({
    total_employees: 0,
    active_employees: 0,
    inactive_employees: 0,
    incomplete_profiles: 0,
    passport_expiring: 0,
    wp_expiring: 0,
    ssic_gt_expiring: 0,
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Get user info and alert counts on mount
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);

    api.get("dashboard/?division=all")
      .then((res) => {
        setAlertCounts(res.data);
      })
      .catch((err) => console.error("Error loading alert counts:", err));
  }, []);

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
        console.log(err);
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
      .catch((err) => console.log(err));
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

  const hasActiveFilters =
    designation || nationality || docType || joinedFrom || joinedTo;

  const clearFilters = () => {
    setDesignation("");
    setNationality("");
    setDocType("");
    setTempDocType("");
    setExpiryDays("60");
    setTempExpiryDays("60");
    setJoinedFrom("");
    setJoinedTo("");
    setCurrentPage(1);
  };
  
  const applyExpiryFilter = () => {
    setDocType(tempDocType);
    setExpiryDays(tempExpiryDays);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalEmployees / pageSize);

  return (
    <div className="employee-page">
      {/* ── HEADER ────────────────────────────────────── */}
      <div className="employee-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>Employee List</h1>
        </div>

        <div className="filters">
          {/* ── Primary Search ── */}
          <div className="filter-group primary">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by ID, Name, WP, FIN or SSIC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input primary"
              />
            </div>
          </div>

          {/* ── Secondary Filters ── */}
          <div className="filter-group secondary">
            <select
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

            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* ── Tertiary Filters ── */}
          <div className="filter-group tertiary">
            <input
              type="text"
              placeholder="Designation..."
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="search-input"
            />

            <input
              type="text"
              placeholder="Nationality..."
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="search-input"
            />

            <div className="expiry-filter-group">
              <select
                value={tempDocType}
                onChange={(e) => setTempDocType(e.target.value)}
                className="expiry-type-select"
              >
                <option value="">All Documents</option>
                <option value="wp">Work Permit</option>
                <option value="passport">Passport</option>
                <option value="ssic_gt">SSIC GT</option>
                <option value="ssic_ht">SSIC HT</option>
                <option value="security_bond">Security Bond</option>
              </select>
              <div className="expiry-days-wrapper">
                <span>Expiring in next</span>
                <input
                  type="number"
                  value={tempExpiryDays}
                  onChange={(e) => setTempExpiryDays(e.target.value)}
                  className="expiry-days-input"
                  min="1"
                />
                <span>days</span>
              </div>
              <button 
                className="apply-expiry-btn"
                onClick={applyExpiryFilter}
              >
                Check
              </button>
            </div>
          </div>

          {/* ── Date Range ── */}
          <div className="filter-group date-range">
            <span className="date-label">📅 Joined Between</span>
            <input
              type="date"
              value={joinedFrom}
              onChange={(e) => setJoinedFrom(e.target.value)}
              title="Joined From"
            />
            <span className="date-sep">—</span>
            <input
              type="date"
              value={joinedTo}
              onChange={(e) => setJoinedTo(e.target.value)}
              title="Joined To"
            />
          </div>

          {hasActiveFilters && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              ✕ Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Priority Alerts Deck ────────────────────────── */}
      <section className="employee-alerts-deck">
        <div className="alerts-grid-employee">
          
          {/* Card 1: Total Employees */}
          <div 
            onClick={() => {
              setStatus("");
              setIncomplete("");
              setDocType("");
              setExpiryDays("60");
              setCurrentPage(1);
            }}
            className={`alert-strip-card blue clickable ${!status && !incomplete && !docType ? "active-filter" : ""}`}
          >
            <div className="alert-icon-circle">
              <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={16} stroke="#3b82f6" />
            </div>
            <div className="alert-strip-body">
              <div className="alert-strip-title">{alertCounts.total_employees || 0} Total Employees</div>
              <div className="alert-strip-subtitle">All active & inactive</div>
            </div>
          </div>

          {/* Card 2: Active Employees */}
          <div 
            onClick={() => {
              setStatus("active");
              setIncomplete("");
              setDocType("");
              setExpiryDays("60");
              setCurrentPage(1);
            }}
            className={`alert-strip-card green clickable ${status === "active" && !incomplete && !docType ? "active-filter" : ""}`}
          >
            <div className="alert-icon-circle">
              <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size={16} stroke="#10b981" />
            </div>
            <div className="alert-strip-body">
              <div className="alert-strip-title">{alertCounts.active_employees || 0} Active Employees</div>
              <div className="alert-strip-subtitle">Current workforce</div>
            </div>
          </div>

          {/* Card 3: Inactive Employees */}
          <div 
            onClick={() => {
              setStatus("inactive");
              setIncomplete("");
              setDocType("");
              setExpiryDays("60");
              setCurrentPage(1);
            }}
            className={`alert-strip-card red clickable ${status === "inactive" && !incomplete && !docType ? "active-filter" : ""}`}
          >
            <div className="alert-icon-circle">
              <Icon d="M18.36 18.36A9 9 0 115.64 5.64m12.72 12.72A9 9 0 115.64 5.64" size={16} stroke="#ef4444" />
            </div>
            <div className="alert-strip-body">
              <div className="alert-strip-title">{alertCounts.inactive_employees || 0} Inactive Employees</div>
              <div className="alert-strip-subtitle">Exited workforce</div>
            </div>
          </div>

          {/* Card 4: Incomplete Profiles */}
          <div 
            onClick={() => {
              setStatus("");
              setIncomplete("true");
              setDocType("");
              setExpiryDays("");
              setCurrentPage(1);
            }}
            className={`alert-strip-card danger clickable ${incomplete === "true" ? "active-filter" : ""}`}
          >
            <div className="alert-icon-circle">
              <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={16} stroke="#dc2626" />
            </div>
            <div className="alert-strip-body">
              <div className="alert-strip-title">{alertCounts.incomplete_profiles || 0} Incomplete Profiles</div>
              <div className="alert-strip-subtitle">Action required</div>
            </div>
          </div>

          {/* Card 5: Passport Expiring */}
          <div 
            onClick={() => {
              setStatus("");
              setIncomplete("");
              setDocType("passport");
              setExpiryDays("90");
              setCurrentPage(1);
            }}
            className={`alert-strip-card warning clickable ${docType === "passport" && expiryDays === "90" ? "active-filter" : ""}`}
          >
            <div className="alert-icon-circle">
              <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size={16} stroke="#d97706" />
            </div>
            <div className="alert-strip-body">
              <div className="alert-strip-title">{alertCounts.passport_expiring || 0} Passports Expiring</div>
              <div className="alert-strip-subtitle">Within 90 days</div>
            </div>
          </div>

          {/* Card 6: Work Permit Expiring */}
          <div 
            onClick={() => {
              setStatus("");
              setIncomplete("");
              setDocType("wp");
              setExpiryDays("60");
              setCurrentPage(1);
            }}
            className={`alert-strip-card info clickable ${docType === "wp" && expiryDays === "60" ? "active-filter" : ""}`}
          >
            <div className="alert-icon-circle">
              <Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size={16} stroke="#2563eb" />
            </div>
            <div className="alert-strip-body">
              <div className="alert-strip-title">{alertCounts.wp_expiring || 0} Work Permits Expiring</div>
              <div className="alert-strip-subtitle">Within 60 days</div>
            </div>
          </div>

          {/* Card 7: SSIC / ID Expiring */}
          <div 
            onClick={() => {
              setStatus("");
              setIncomplete("");
              setDocType("ssic_gt");
              setExpiryDays("60");
              setCurrentPage(1);
            }}
            className={`alert-strip-card purple clickable ${docType === "ssic_gt" && expiryDays === "60" ? "active-filter" : ""}`}
          >
            <div className="alert-icon-circle">
              <Icon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" size={16} stroke="#7c3aed" />
            </div>
            <div className="alert-strip-body">
              <div className="alert-strip-title">{alertCounts.ssic_gt_expiring || 0} SSIC / ID Expiring</div>
              <div className="alert-strip-subtitle">Within 60 days</div>
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
              // Skeleton Loader
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
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    <p>No employees found</p>
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
                    <strong>{e.name}</strong>
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
            <div className="confirm-modal-icon">⚠️</div>
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
    </div>
  );
}

export default EmployeeList;
