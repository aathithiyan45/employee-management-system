import React, { useState, useEffect } from "react";
import api from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import SearchableSelect from "../components/SearchableSelect.js";
import "./WorkLog.css";

function WorkLog() {
  const [workLogs, setWorkLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    employee: "",
    date: new Date().toISOString().split('T')[0],
    hours: ""
  });

  const [filterMonth, setFilterMonth] = useState("");
  const [filterEmp, setFilterEmp] = useState("");

  const fetchEmployees = React.useCallback(async () => {
    try {
      const res = await api.get("/employees/?is_active=true&page_size=1000");
      setEmployees(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  }, []);

  const fetchWorkLogs = React.useCallback(async () => {
    try {
      let url = "/worklog/";
      const params = new URLSearchParams();
      if (filterMonth) params.append("month", filterMonth);
      if (filterEmp)   params.append("employee", filterEmp);
      
      const res = await api.get(`${url}?${params.toString()}`);
      setWorkLogs(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch worklogs", err);
    }
  }, [filterMonth, filterEmp]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchWorkLogs();
  }, [fetchWorkLogs]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmployeeSelect = (empId) => {
    setFormData({ ...formData, employee: empId });
  };

  const handleFilterEmpSelect = (empId) => {
    setFilterEmp(empId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee) {
      setError("Please select an employee");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/worklog/", formData);
      setFormData({ ...formData, hours: "" });
      setSuccess("WorkLog added successfully!");
      fetchWorkLogs();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to create worklog", err);
      setError(err.response?.data?.non_field_errors?.[0] || err.response?.data?.hours?.[0] || "Failed to add worklog");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main worklog-page">
        <header className="worklog-header">
          <div className="header-left">
            <h1>Daily WorkLog</h1>
          </div>
        </header>

        <section className="dashboard-content">
          {error && <div className="worklog-alert worklog-alert-error">{error}</div>}
          {success && <div className="worklog-alert worklog-alert-success">{success}</div>}

          <div className="worklog-form-container">
            <h2>Add Daily Hours</h2>
            <form onSubmit={handleSubmit} className="worklog-form">
              <div className="form-group">
                <label>Employee</label>
                <SearchableSelect 
                  options={employees}
                  placeholder="Type ID or Name..."
                  value={formData.employee}
                  onSelect={handleEmployeeSelect}
                  displayKey="name"
                  valueKey="emp_id"
                  subKey="emp_id"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required className="worklog-input" />
              </div>
              <div className="form-group">
                <label>Hours (max 24)</label>
                <input type="number" step="0.5" min="0.5" max="24" name="hours" value={formData.hours} onChange={handleChange} required className="worklog-input" />
              </div>
              <div className="form-group">
                <label>&nbsp;</label>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? "Adding..." : "Add Hours"}
                </button>
              </div>
            </form>
          </div>

          <div className="worklog-filters">
            <div className="filter-group">
              <label>Filter by Month:</label>
              <input 
                type="month" 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)} 
                className="worklog-input"
              />
            </div>
            <div className="filter-group">
              <label>Filter by Employee:</label>
              <div style={{ minWidth: "200px" }}>
                <SearchableSelect 
                  options={employees}
                  placeholder="All Employees"
                  value={filterEmp}
                  onSelect={handleFilterEmpSelect}
                  displayKey="name"
                  valueKey="emp_id"
                  subKey="emp_id"
                />
              </div>
            </div>
            {(filterMonth || filterEmp) && (
              <button 
                className="btn-filter-clear" 
                onClick={() => { setFilterMonth(""); setFilterEmp(""); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
            <span className="stats-text">
              Showing {workLogs.length} matching entries
            </span>
          </div>

          <div className="table-wrapper">
            <table className="worklog-table">
              <thead>
                <tr>
                  <th width="15%" className="text-left">EMP ID</th>
                  <th width="35%" className="text-left">Name</th>
                  <th width="25%" className="text-center">Date</th>
                  <th width="25%" className="text-center">Hours</th>
                </tr>
              </thead>
              <tbody>
                {workLogs.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: "40px" }}>No worklogs found.</td></tr>
                ) : (
                  workLogs.map((log, index) => (
                    <tr key={log.id} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                      <td className="text-left">
                        <span className="emp-id-badge">{log.employee_id_str}</span>
                      </td>
                      <td className="text-left"><strong>{log.employee_name}</strong></td>
                      <td className="text-center">{log.date}</td>
                      <td className="text-center">{log.hours}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default WorkLog;
