import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./EmployeeList.css";

function EmployeeList() {
  const navigate = useNavigate();

  const [employees, setEmployees]             = useState([]);
  const [division, setDivision]               = useState("");
  const [divisions, setDivisions]             = useState([]);
  const [status, setStatus]                   = useState("");
  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── New filter states ──────────────────────────────────
  const [designation, setDesignation] = useState("");
  const [nationality, setNationality] = useState("");
  const [expiryAlert, setExpiryAlert] = useState("");
  const [joinedFrom, setJoinedFrom]   = useState("");
  const [joinedTo, setJoinedTo]       = useState("");

  // ── Fetch Divisions ────────────────────────────────────
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/divisions/")
      .then(res => {
        setDivisions(res.data);
        if (res.data.length > 0) setDivision(res.data[0].name);
      })
      .catch(err => console.log(err));
  }, []);

  // ── Fetch Employees ────────────────────────────────────
  useEffect(() => {
    if (!division) return;
    axios.get("http://127.0.0.1:8000/api/employees/", {
      params: {
        division,
        status,
        search: debouncedSearch,
        designation,
        nationality,
        expiry_alert: expiryAlert,
        joined_from: joinedFrom,
        joined_to: joinedTo,
      }
    })
      .then(res => setEmployees(res.data))
      .catch(err => console.log(err));
  }, [division, status, debouncedSearch, designation, nationality, expiryAlert, joinedFrom, joinedTo]);

  // ── Debounce Search ────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const hasActiveFilters = designation || nationality || expiryAlert || joinedFrom || joinedTo;

  const clearFilters = () => {
    setDesignation("");
    setNationality("");
    setExpiryAlert("");
    setJoinedFrom("");
    setJoinedTo("");
  };

  return (
    <div className="employee-page">

      {/* ── HEADER ────────────────────────────────────── */}
      <div className="employee-header">
        <h1>Employee List</h1>

        <div className="filters">

          {/* ── Filter Row 1 ── */}
          <div className="filter-row">
            <input
              type="text"
              placeholder="Search by EMP ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input search-input--wide"
            />

            <select value={division} onChange={(e) => setDivision(e.target.value)}>
              {divisions.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>

            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

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
          </div>

          {/* ── Filter Row 2 ── */}
          <div className="filter-row">
            <select value={expiryAlert} onChange={(e) => setExpiryAlert(e.target.value)}>
              <option value="">All Expiry</option>
              <option value="wp">WP Expiring (30d)</option>
              <option value="passport">Passport Expiring (30d)</option>
            </select>

            <div className="date-range-group">
              <span className="date-range-label">Joined</span>
              <input
                type="date"
                value={joinedFrom}
                onChange={(e) => setJoinedFrom(e.target.value)}
                title="Joined From"
              />
              <span className="date-range-sep">→</span>
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
      </div>

      {/* ── TABLE ─────────────────────────────────────── */}
      <div className="table-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th>EMP ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Designation</th>
              <th>Division</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    <p>No employees found</p>
                  </div>
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.emp_id} onClick={() => navigate(`/employees/${e.emp_id}`)}>
                  <td><span className="emp-id-badge">{e.emp_id}</span></td>
                  <td><strong>{e.name}</strong></td>
                  <td>{e.phone || "—"}</td>
                  <td>{e.designation || "—"}</td>
                  <td>{e.division}</td>
                  <td>
                    <span className={`status-pill ${e.status?.toLowerCase() === "active" ? "active" : "inactive"}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default EmployeeList;