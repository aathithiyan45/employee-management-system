import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";

function WorkLog() {
  const [workLogs, setWorkLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    try {
      await axiosInstance.post("/worklog/", formData);
      setFormData({ ...formData, hours: "" });
      fetchWorkLogs();
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
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Daily WorkLog</h1>
        </header>

        <section className="dashboard-content">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="card" style={{ marginBottom: "20px" }}>
            <h2>Add Daily Hours</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label>Employee</label>
                <select name="employee" value={formData.employee} onChange={handleChange} required className="form-input">
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.emp_id} value={emp.emp_id}>{emp.emp_id} - {emp.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required className="form-input" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label>Hours (max 24)</label>
                <input type="number" step="0.5" min="0.5" max="24" name="hours" value={formData.hours} onChange={handleChange} required className="form-input" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: "42px" }}>
                {loading ? "Adding..." : "Add Hours"}
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Recent WorkLogs</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {workLogs.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: "center" }}>No worklogs found.</td></tr>
                ) : (
                  workLogs.map(log => (
                    <tr key={log.id}>
                      <td>{log.employee_id_str}</td>
                      <td>{log.employee_name}</td>
                      <td>{log.date}</td>
                      <td>{log.hours}</td>
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
