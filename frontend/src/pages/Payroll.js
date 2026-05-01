import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./Payroll.css";

function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchPayrolls(month, page);
  }, [month, page]);

  const fetchPayrolls = async (selectedMonth, currentPage) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/payroll/?month=${selectedMonth}&page=${currentPage}`);
      
      if (res.data.results) {
        setPayrolls(res.data.results);
        setCount(res.data.count);
        setTotalPages(Math.ceil(res.data.count / 15));
      } else {
        setPayrolls(res.data);
        setCount(res.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to fetch payrolls", err);
      if (err.response?.status === 404 && currentPage > 1) {
        setPage(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await axiosInstance.post("/payroll/generate/", { month });
      setSuccess("Payroll generated successfully for " + month);
      setPage(1);
      fetchPayrolls(month, 1);
    } catch (err) {
      console.error("Failed to generate payroll", err);
      setError("Failed to generate payroll. Please check connection.");
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
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to update status", err);
      setError("Failed to update status.");
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main payroll-page">
        <div className="payroll-header">
          <div className="header-left">
            <h1>Monthly Payroll</h1>
          </div>
        </div>

        <section className="dashboard-content">
          {error && <div className="payroll-alert payroll-alert-error">{error}</div>}
          {success && <div className="payroll-alert payroll-alert-success">{success}</div>}

          {/* Generation Section */}
            <div className="generation-form">
              <div className="form-group">
                <label>Select Month</label>
                <input 
                  type="month" 
                  value={month} 
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setPage(1);
                  }} 
                  className="payroll-input" 
                />
              </div>
              <div className="form-group">
                <label>&nbsp;</label>
                <button 
                  className="btn-save" 
                  onClick={handleGenerate} 
                  disabled={loading || !month}
                  style={{ height: "38px", padding: "0 20px" }}
                >
                  {loading ? "Processing..." : "Generate Payroll"}
                </button>
              </div>
            </div>

          {/* Stats Bar */}
          <div className="stats-bar">
            <span className="stats-text">
              Showing {payrolls.length} of {count} payroll records for {month}
            </span>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th width="15%" className="text-left">EMP ID</th>
                  <th width="25%" className="text-left">Name</th>
                  <th width="15%" className="text-center">Total Hours</th>
                  <th width="15%" className="text-center">Net Salary</th>
                  <th width="15%" className="text-center">Status</th>
                  <th width="15%" className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && payrolls.length === 0 ? (
                   <tr><td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>Loading records...</td></tr>
                ) : payrolls.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>No payroll records found.</td></tr>
                ) : (
                  payrolls.map((p, index) => (
                    <tr key={p.id} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                      <td className="text-left">
                        <span className="emp-id-badge">{p.employee_id_str}</span>
                      </td>
                      <td className="text-left"><strong>{p.employee_name}</strong></td>
                      <td className="text-center">{p.total_hours}</td>
                      <td className="text-center"><strong>${parseFloat(p.total_salary).toFixed(2)}</strong></td>
                      <td className="text-center">
                        <span className={`status-pill ${p.status}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <button 
                          className={`action-btn ${p.status === "pending" ? "pay" : "revert"}`}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="page-btn" 
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ‹ Prev
              </button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button 
                className="page-btn" 
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next ›
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Payroll;
