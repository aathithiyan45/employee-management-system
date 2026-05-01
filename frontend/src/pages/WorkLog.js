import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";
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

  useEffect(() => {
    fetchEmployees();
    fetchWorkLogs();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axiosInstance.get("/employees/?is_active=true&page_size=1000");
      setEmployees(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  const fetchWorkLogs = async () => {
    try {
      const res = await axiosInstance.get("/worklog/");
      setWorkLogs(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch worklogs", err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axiosInstance.post("/worklog/", formData);
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
                <select name="employee" value={formData.employee} onChange={handleChange} required className="worklog-select">
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.emp_id} value={emp.emp_id}>{emp.emp_id} - {emp.name}</option>
                  ))}
                </select>
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
                <button type="submit" className="btn-save" disabled={loading} style={{ height: "38px", padding: "0 20px" }}>
                  {loading ? "Adding..." : "Add Hours"}
                </button>
              </div>
            </form>
          </div>

          <div className="stats-bar">
            <span className="stats-text">
              Showing {workLogs.length} recent worklog entries
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
