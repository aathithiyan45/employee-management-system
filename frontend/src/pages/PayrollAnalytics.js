import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./Payroll.css"; // Reuse existing styles
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Pie, Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const PRIMARY_COLOR = "#3b82f6"; // var(--blue-500)
const SUCCESS_COLOR = "#22c55e"; // var(--success)
const WARNING_COLOR = "#f59e0b"; // var(--warning)

function PayrollAnalytics() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [trendData, setTrendData] = useState([]);
  const [divisionData, setDivisionData] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  const [topEmployeesData, setTopEmployeesData] = useState([]);
  const [scatterData, setScatterData] = useState([]);
  const [alertsData, setAlertsData] = useState(null);
  const [employeeTrendData, setEmployeeTrendData] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, [year]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeTrend();
    } else {
      setEmployeeTrendData([]);
    }
  }, [selectedEmployee, year]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [trend, div, desig, top, scatter, alerts, emps] = await Promise.all([
        axiosInstance.get(`/payroll/trend/?year=${year}`),
        axiosInstance.get(`/payroll/by-division/?year=${year}`),
        axiosInstance.get(`/payroll/by-designation/?year=${year}`),
        axiosInstance.get(`/payroll/top-employees/?year=${year}`),
        axiosInstance.get(`/payroll/scatter/?year=${year}`),
        axiosInstance.get(`/payroll/alerts/?year=${year}`),
        axiosInstance.get(`/employees/?limit=1000`)
      ]);
      setTrendData(trend.data);
      setDivisionData(div.data);
      setDesignationData(desig.data);
      setTopEmployeesData(top.data);
      setScatterData(scatter.data);
      setAlertsData(alerts.data);
      
      if (emps.data.results) {
        setEmployees(emps.data.results);
      } else {
        setEmployees(emps.data);
      }
    } catch (err) {
      console.error("Failed to load analytics data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeTrend = async () => {
    try {
      const res = await axiosInstance.get(`/payroll/trend/${selectedEmployee}/?year=${year}`);
      setEmployeeTrendData(res.data);
    } catch (err) {
      console.error("Failed to load employee trend", err);
    }
  };

  // Shared chart options
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    }
  };

  const hasData = trendData.length > 0 || divisionData.length > 0;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main payroll-page">
        <div className="payroll-header">
          <div className="header-left">
            <h1>Payroll Analytics</h1>
          </div>
          <div className="header-right" style={{ display: "flex", gap: "12px" }}>
            <select 
              value={year} 
              onChange={(e) => setYear(e.target.value)}
              className="payroll-input"
              style={{ padding: "8px 12px", width: "120px" }}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <section className="dashboard-content">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>Loading analytics...</div>
          ) : !hasData ? (
             <div className="table-wrapper">
               <div style={{ textAlign: "center", padding: "60px 20px" }}>
                 <div className="empty-state">
                   <span style={{ fontSize: "30px", display: "block", marginBottom: "10px" }}>📊</span>
                   <h3 style={{ margin: "0 0 5px 0", color: "var(--grey-800)" }}>No payroll data available</h3>
                   <p style={{ margin: 0, color: "var(--grey-500)" }}>There is no payroll data for the selected year.</p>
                 </div>
               </div>
             </div>
          ) : (
            <div className="kpi-dashboard" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Row 1: Monthly Trend */}
              <div className="chart-card">
                <h4>📈 Monthly Payroll Trend ({year})</h4>
                <div className="chart-container" style={{ height: "300px", marginTop: "16px" }}>
                  <Line 
                    data={{
                      labels: trendData.map(d => d.month),
                      datasets: [{
                        label: 'Total Salary ($)',
                        data: trendData.map(d => d.total),
                        borderColor: PRIMARY_COLOR,
                        backgroundColor: `${PRIMARY_COLOR}20`,
                        fill: true,
                        tension: 0.4,
                      }]
                    }}
                    options={defaultOptions}
                  />
                </div>
              </div>

              {/* Row 2: Division Chart & Top Employees */}
              <div className="payroll-charts-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: 0 }}>
                <div className="chart-card">
                  <h4>🏢 Payroll by Division</h4>
                  <div className="chart-container" style={{ height: "250px", marginTop: "16px" }}>
                    <Pie 
                      data={{
                        labels: divisionData.map(d => d.name),
                        datasets: [{
                          data: divisionData.map(d => d.value),
                          backgroundColor: [
                            PRIMARY_COLOR, WARNING_COLOR, SUCCESS_COLOR, 
                            '#8b5cf6', '#ec4899', '#14b8a6'
                          ],
                        }]
                      }}
                      options={{ ...defaultOptions, plugins: { legend: { position: 'right' } } }}
                    />
                  </div>
                </div>

                <div className="chart-card">
                  <h4>👤 Top 5 Earners</h4>
                  <div className="chart-container" style={{ height: "250px", marginTop: "16px" }}>
                    <Bar 
                      data={{
                        labels: topEmployeesData.map(d => d.name),
                        datasets: [{
                          label: 'Salary ($)',
                          data: topEmployeesData.map(d => d.total),
                          backgroundColor: SUCCESS_COLOR,
                          borderRadius: 4
                        }]
                      }}
                      options={{ ...defaultOptions, indexAxis: 'y' }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Employee Trend */}
              <div className="chart-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h4 style={{ margin: 0 }}>👤 Employee Monthly Trend</h4>
                  <select 
                    className="payroll-input" 
                    value={selectedEmployee} 
                    onChange={e => setSelectedEmployee(e.target.value)}
                    style={{ width: "200px" }}
                  >
                    <option value="">Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.emp_id})</option>
                    ))}
                  </select>
                </div>
                {selectedEmployee ? (
                  <div className="chart-container" style={{ height: "250px" }}>
                    <Line 
                      data={{
                        labels: employeeTrendData.map(d => d.month),
                        datasets: [{
                          label: 'Salary ($)',
                          data: employeeTrendData.map(d => d.total),
                          borderColor: WARNING_COLOR,
                          backgroundColor: `${WARNING_COLOR}20`,
                          fill: true,
                          tension: 0.4,
                        }]
                      }}
                      options={defaultOptions}
                    />
                  </div>
                ) : (
                  <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--grey-500)" }}>
                    Please select an employee to view their trend.
                  </div>
                )}
              </div>

              {/* Row 4: Designation Chart */}
              <div className="chart-card">
                <h4>💼 Salary by Designation</h4>
                <div className="chart-container" style={{ height: "250px", marginTop: "16px" }}>
                  <Bar 
                    data={{
                      labels: designationData.map(d => d.name),
                      datasets: [{
                        label: 'Total Salary ($)',
                        data: designationData.map(d => d.value),
                        backgroundColor: PRIMARY_COLOR,
                        borderRadius: 4
                      }]
                    }}
                    options={defaultOptions}
                  />
                </div>
              </div>

              {/* Row 5: Scatter & Alerts */}
              <div className="payroll-charts-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: 0 }}>
                <div className="chart-card">
                  <h4>📊 Hours vs Salary (Scatter)</h4>
                  <div className="chart-container" style={{ height: "250px", marginTop: "16px" }}>
                    <Scatter 
                      data={{
                        datasets: [{
                          label: 'Employees',
                          data: scatterData.map(d => ({ x: d.hours, y: d.salary, name: d.name })),
                          backgroundColor: WARNING_COLOR
                        }]
                      }}
                      options={{
                        ...defaultOptions,
                        scales: {
                          x: { title: { display: true, text: 'Total Hours' } },
                          y: { title: { display: true, text: 'Total Salary ($)' } }
                        },
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.raw.name}: ${ctx.raw.x} hrs, $${ctx.raw.y}`
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="chart-card" style={{ display: "flex", flexDirection: "column" }}>
                  <h4>🔔 Analytics Alerts</h4>
                  {alertsData && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px", flex: 1, justifyContent: "center" }}>
                      <div className="analytics-card warning-card" style={{ marginBottom: 0 }}>
                        <div className="analytics-label">🔴 High Salary Records</div>
                        <div className="analytics-value" style={{ color: "var(--danger)" }}>{alertsData.high_salary}</div>
                        <div className="analytics-subtext">Salary &gt; $2,000</div>
                      </div>
                      <div className="analytics-card pending-card" style={{ marginBottom: 0 }}>
                        <div className="analytics-label">🟠 High Overtime</div>
                        <div className="analytics-value" style={{ color: "var(--warning)" }}>{alertsData.overtime}</div>
                        <div className="analytics-subtext">Hours &gt; 220</div>
                      </div>
                      <div className="analytics-card total" style={{ marginBottom: 0 }}>
                        <div className="analytics-label">🟡 Low Work Hours</div>
                        <div className="analytics-value" style={{ color: "var(--purple-600)" }}>{alertsData.low_work}</div>
                        <div className="analytics-subtext">Hours &lt; 80</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default PayrollAnalytics;
