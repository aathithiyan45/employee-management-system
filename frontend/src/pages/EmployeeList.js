import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosInstance";
import Toast from "../components/Toast";
import "./EmployeeList.css";

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
  const [docType, setDocType] = useState(urlParams.get("doc_type") || "");
  const [expiryDays, setExpiryDays] = useState(urlParams.get("days") || "60");
  const [tempDocType, setTempDocType] = useState(urlParams.get("doc_type") || "");
  const [tempExpiryDays, setTempExpiryDays] = useState(urlParams.get("days") || "60");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [incomplete, setIncomplete] = useState(urlParams.get("incomplete") || "");
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  // Get user info from localStorage
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
  }, []);

  // ── Parse URL parameters on mount ──────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const divisionParam = urlParams.get("division");
    const statusParam = urlParams.get("status");
    const docTypeParam = urlParams.get("doc_type");
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
  const deleteEmployee = async (empId, empName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete employee ${empName} (${empId})? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`employees/${empId}/`);
      // Refresh the employee list
      fetchEmployees();
      showToast("Employee deleted successfully");
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
