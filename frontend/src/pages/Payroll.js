import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./Payroll.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip
);

function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generatedSuccess, setGeneratedSuccess] = useState(false);
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [count, setCount] = useState(0);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ordering, setOrdering] = useState("-total_salary");

  // Analytics state
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    // Reset generated status when month changes
    setGeneratedSuccess(false);
    fetchPayrolls(month, page, search, statusFilter, ordering);
    fetchAnalytics(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, page, search, statusFilter, ordering]);

  const fetchAnalytics = async (selectedMonth) => {
    try {
      const res = await axiosInstance.get(`/payroll-analytics/?month=${selectedMonth}`);
      setAnalytics(res.data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
      setAnalytics(null);
    }
  };

  const fetchPayrolls = async (selectedMonth, currentPage, currentSearch, currentStatus, currentOrdering) => {
    setLoading(true);
    try {
      let url = `/payroll/?month=${selectedMonth}&page=${currentPage}&ordering=${currentOrdering}`;
      if (currentSearch) url += `&search=${currentSearch}`;
      if (currentStatus !== "All") url += `&status=${currentStatus.toLowerCase()}`;
      
      const res = await axiosInstance.get(url);
      
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
      setGeneratedSuccess(true);
      setPage(1);
      fetchPayrolls(month, 1, search, statusFilter, ordering);
      fetchAnalytics(month);
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
      fetchAnalytics(month); // Refresh analytics pending count
    } catch (err) {
      console.error("Failed to update status", err);
      setError("Failed to update status.");
    }
  };

  const handleSort = (field) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else {
      setOrdering(field);
    }
    setPage(1);
  };

  const isPayrollGenerated = payrolls.length > 0 || generatedSuccess;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main payroll-page">
        <div className="payroll-header">
          <div className="header-left">
            <h1>Monthly Payroll</h1>
          </div>
          {analytics && analytics.total_hours > 0 && (
            <div className="header-right">
              <span className="total-hours-badge">Total Hours This Month: {analytics.total_hours} hrs</span>
            </div>
          )}
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
                className={`btn-save ${generatedSuccess ? 'success-btn' : ''}`} 
                onClick={handleGenerate} 
                disabled={loading || !month || generatedSuccess}
                style={{ height: "38px", padding: "0 20px" }}
              >
                {loading ? "Processing..." : generatedSuccess ? "✔ Payroll Generated" : "Generate Payroll"}
              </button>
            </div>
          </div>

          {/* Analytics Cards */}
          {analytics && (
            <div className="kpi-dashboard">
              <div className="analytics-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="analytics-card total">
                  <div className="analytics-label">💰 Total Payroll</div>
                  <div className="analytics-value">${parseFloat(analytics.total_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="analytics-card hours">
                  <div className="analytics-label">⏱️ Total Hours</div>
                  <div className="analytics-value">{analytics.total_hours || 0} hrs</div>
                </div>
                <div className="analytics-card avg">
                  <div className="analytics-label">📊 Average Salary</div>
                  <div className="analytics-value">${parseFloat(analytics.avg_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div className="analytics-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="analytics-card division">
                  <div className="analytics-label">🏢 Highest Cost Division</div>
                  <div className="analytics-value" style={{ fontSize: "18px" }}>{analytics.division_data?.[0]?.division_name || 'N/A'}</div>
                  {analytics.division_data?.[0] && (
                    <div className="analytics-subtext">${parseFloat(analytics.division_data[0].total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  )}
                </div>
                <div className="analytics-card earner">
                  <div className="analytics-label">👤 Top Earner</div>
                  <div className="analytics-value" style={{ fontSize: "18px" }}>{analytics.top_employees?.[0]?.employee__name || 'N/A'}</div>
                  {analytics.top_employees?.[0] && (
                    <div className="analytics-subtext">${parseFloat(analytics.top_employees[0].total_salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  )}
                </div>
                <div className="analytics-card warning-card">
                  <div className="analytics-label">⚠️ No Work Logs</div>
                  <div className="analytics-value" style={{ color: "var(--danger)" }}>{analytics.no_worklogs_count || 0}</div>
                  <div className="analytics-subtext">Employees missing logs</div>
                </div>
                <div className="analytics-card pending-card">
                  <div className="analytics-label">🟠 Pending Payroll</div>
                  <div className="analytics-value" style={{ color: "var(--warning)" }}>{analytics.pending_count || 0}</div>
                  <div className="analytics-subtext">Unpaid records</div>
                </div>
              </div>

              {/* Monthly Trend Chart */}
              <div className="payroll-charts-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="chart-card">
                  <h4>📈 Monthly Payroll Trend</h4>
                  <div className="chart-container" style={{ height: "200px" }}>
                    <Line 
                      data={{
                        labels: analytics.monthly_trend?.map(t => t.month) || [],
                        datasets: [{
                          label: 'Total Payroll ($)',
                          data: analytics.monthly_trend?.map(t => t.total) || [],
                          borderColor: '#3b82f6',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: '#3b82f6',
                        }]
                      }}
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table Filters & Stats Bar */}
          <div className="table-filters-bar">
            <div className="stats-text">
              Showing {payrolls.length} of {count} payroll records for {month}
            </div>
            <div className="filters-right">
              <input 
                type="text" 
                placeholder="🔍 Search name or EMP ID..." 
                className="payroll-input search-input"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <select 
                className="payroll-input status-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th width="15%" className="text-left sortable" onClick={() => handleSort('employee__emp_id')}>
                    EMP ID {ordering === 'employee__emp_id' ? '↑' : ordering === '-employee__emp_id' ? '↓' : ''}
                  </th>
                  <th width="25%" className="text-left sortable" onClick={() => handleSort('employee__name')}>
                    Name {ordering === 'employee__name' ? '↑' : ordering === '-employee__name' ? '↓' : ''}
                  </th>
                  <th width="15%" className="text-center sortable" onClick={() => handleSort('total_hours')}>
                    Total Hours {ordering === 'total_hours' ? '↑' : ordering === '-total_hours' ? '↓' : ''}
                  </th>
                  <th width="15%" className="text-center sortable" onClick={() => handleSort('total_salary')}>
                    Net Salary {ordering === 'total_salary' ? '↑' : ordering === '-total_salary' ? '↓' : ''}
                  </th>
                  <th width="15%" className="text-center">Status</th>
                  <th width="15%" className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && payrolls.length === 0 ? (
                   <tr><td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>Loading records...</td></tr>
                ) : !isPayrollGenerated && payrolls.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "60px 20px" }}>
                      <div className="empty-state">
                        <span style={{ fontSize: "30px", display: "block", marginBottom: "10px" }}>📑</span>
                        <h3 style={{ margin: "0 0 5px 0", color: "var(--grey-800)" }}>No payroll generated yet.</h3>
                        <p style={{ margin: 0, color: "var(--grey-500)" }}>Click "Generate Payroll" to begin calculating this month's salaries.</p>
                      </div>
                    </td>
                  </tr>
                ) : payrolls.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>No matching payroll records found.</td></tr>
                ) : (
                  payrolls.map((p, index) => (
                    <tr key={p.id} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                      <td className="text-left">
                        <span className="emp-id-badge">{p.employee_id_str}</span>
                      </td>
                      <td className="text-left"><strong>{p.employee_name}</strong></td>
                      
                      {/* Zero Hours Handle */}
                      <td className="text-center">
                        {parseFloat(p.total_hours) === 0 ? (
                          <div className="missing-logs-badge">
                            <div className="no-data-text">No Data</div>
                            <div className="warning-text">⚠ Missing Work Logs</div>
                          </div>
                        ) : (
                          `${p.total_hours} hrs`
                        )}
                      </td>
                      
                      <td className="text-center"><strong>${parseFloat(p.total_salary).toFixed(2)}</strong></td>
                      
                      {/* Better Status UI */}
                      <td className="text-center">
                        <span className={`status-pill ${p.status.toLowerCase()}`}>
                          {p.status.toLowerCase() === 'paid' ? '🟢 Paid' : '🟠 Pending'}
                        </span>
                      </td>
                      
                      {/* Action Buttons */}
                      <td className="text-center">
                        <button 
                          className={`action-btn pay ${p.status.toLowerCase() === "paid" ? "disabled" : ""}`}
                          onClick={() => handleStatusChange(p.id, p.status)}
                          disabled={p.status.toLowerCase() === "paid"}
                        >
                          Mark Paid
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
