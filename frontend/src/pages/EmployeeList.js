import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./EmployeeList.css";

function EmployeeList() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(false);
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  // Removed debouncedSearch

  // ── New filter states ──────────────────────────────────
  const [designation, setDesignation] = useState("");
  const [nationality, setNationality] = useState("");
  const [expiryAlert, setExpiryAlert] = useState("");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");

  // ── Edit Employee States ──────────────────────────────────
  // Removed editEmployee and formData states - now using profile page

  // ── Fetch Employees Function ─────────────────────────────
  const fetchEmployees = () => {
    if (!division) return;
    setLoading(true);
    axios
      .get("http://127.0.0.1:8000/api/employees/", {
        params: {
          division,
          status,
          search: search,
          designation,
          nationality,
          expiry_alert: expiryAlert,
          joined_from: joinedFrom,
          joined_to: joinedTo,
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
  };

  // ── Fetch Divisions ────────────────────────────────────
  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/api/divisions/")
      .then((res) => {
        setDivisions(res.data);
        if (res.data.length > 0) setDivision(res.data[0].name);
      })
      .catch((err) => console.log(err));
  }, []);

  // ── Fetch Employees ────────────────────────────────────
  useEffect(() => {
    fetchEmployees();
  }, [
    division,
    status,
    search,
    designation,
    nationality,
    expiryAlert,
    joinedFrom,
    joinedTo,
    currentPage,
    pageSize,
  ]);

  const hasActiveFilters =
    designation || nationality || expiryAlert || joinedFrom || joinedTo;

  const clearFilters = () => {
    setDesignation("");
    setNationality("");
    setExpiryAlert("");
    setJoinedFrom("");
    setJoinedTo("");
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
                placeholder="Search by EMP ID or Name..."
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
              <option value="">All Divisions</option>
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

            <select
              value={expiryAlert}
              onChange={(e) => setExpiryAlert(e.target.value)}
            >
              <option value="">All Expiry</option>
              <option value="wp">WP Expiring (30d)</option>
              <option value="passport">Passport Expiring (30d)</option>
            </select>
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
                  <td className="text-left">{e.designation || "—"}</td>
                  <td className="text-left">{e.division}</td>
                  <td className="text-center">
                    <span
                      className={`status-pill ${e.status?.toLowerCase() === "active" ? "active" : "inactive"}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      className="edit-btn"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        navigate(`/employees/${e.emp_id}/profile`);
                      }}
                    >
                      Edit
                    </button>
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
    </div>
  );
}

export default EmployeeList;
