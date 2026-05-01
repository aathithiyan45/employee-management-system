import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";

function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchPayrolls(month);
  }, [month]);

  const fetchPayrolls = async (selectedMonth) => {
    try {
      const year = selectedMonth.split("-")[0];
      // We can fetch all and filter, or use our analytics endpoint or just GET /payroll/?year=YYYY
      const res = await axiosInstance.get(`/payroll/?year=${year}`);
      
      // Filter by exactly the month we selected
      const allPayrolls = res.data.results || res.data;
      const filtered = allPayrolls.filter(p => p.month.startsWith(selectedMonth));
      setPayrolls(filtered);
    } catch (err) {
      console.error("Failed to fetch payrolls", err);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await axiosInstance.post("/payroll/generate/", { month });
      setSuccess("Payroll generated successfully!");
      setPayrolls(res.data.data || []);
    } catch (err) {
      console.error("Failed to generate payroll", err);
      setError("Failed to generate payroll. Please check if the month format is correct.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === "pending" ? "paid" : "pending";
    try {
      await axiosInstance.patch(`/payroll/${id}/`, { status: newStatus });
      setPayrolls(payrolls.map(p => p.id === id ? { ...p, status: newStatus } : p));
      setSuccess(`Payroll marked as ${newStatus}!`);
    } catch (err) {
      console.error("Failed to update status", err);
      setError("Failed to update status.");
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Monthly Payroll</h1>
        </header>

        <section className="dashboard-content">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="card" style={{ marginBottom: "20px" }}>
            <h2>Generate Payroll</h2>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label>Month</label>
                <input 
                  type="month" 
                  value={month} 
                  onChange={(e) => setMonth(e.target.value)} 
                  className="form-input" 
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleGenerate} 
                disabled={loading || !month}
                style={{ height: "42px" }}
              >
                {loading ? "Generating..." : "Generate Payroll"}
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Payroll Records ({month})</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Total Hours</th>
                  <th>Salary ($)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center" }}>No payroll records found for this month.</td></tr>
                ) : (
                  payrolls.map(p => (
                    <tr key={p.id}>
                      <td>{p.employee_id_str}</td>
                      <td>{p.employee_name}</td>
                      <td>{p.total_hours}</td>
                      <td>${parseFloat(p.total_salary).toFixed(2)}</td>
                      <td>
                        <span className={`status-badge status-${p.status}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={`btn ${p.status === "pending" ? "btn-success" : "btn-secondary"}`}
                          style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                          onClick={() => handleStatusChange(p.id, p.status)}
                        >
                          {p.status === "pending" ? "Mark Paid" : "Mark Pending"}
                        </button>
                      </td>
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

export default Payroll;
