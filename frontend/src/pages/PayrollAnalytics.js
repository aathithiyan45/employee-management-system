import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./PayrollAnalytics.css";
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
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut, Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  blue:    "#2196F3",
  teal:    "#00ACC1",
  green:   "#2e7d32",
  amber:   "#f59e0b",
  rose:    "#e11d48",
  violet:  "#7c3aed",
  sky:     "#0ea5e9",
  slate:   "#64748b",
  divPalette: ["#2196F3","#00ACC1","#7c3aed","#f59e0b","#e11d48","#2e7d32","#0ea5e9"],
};

const baseChartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600 },
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 11, family: "'DM Sans'" }, color: "#9aa5b4" } },
    y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 11, family: "'DM Sans'" }, color: "#9aa5b4" } },
  },
};

// ── Small reusable KPI tile ────────────────────────────────────────────────
function KpiTile({ label, value, sub, accent, icon }) {
  return (
    <div className="pa-kpi" style={{ "--accent": accent }}>
      <div className="pa-kpi-icon">{icon}</div>
      <div className="pa-kpi-body">
        <div className="pa-kpi-value">{value}</div>
        <div className="pa-kpi-label">{label}</div>
        {sub && <div className="pa-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ── Chart wrapper ──────────────────────────────────────────────────────────
function ChartCard({ title, height = 200, children, action }) {
  return (
    <div className="pa-card">
      <div className="pa-card-head">
        <span className="pa-card-title">{title}</span>
        {action}
      </div>
      <div style={{ height, position: "relative" }}>{children}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
function PayrollAnalytics() {
  const [loading, setLoading]               = useState(true);
  const [year, setYear]                     = useState(new Date().getFullYear().toString());
  const [employees, setEmployees]           = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [trend, setTrend]         = useState([]);
  const [division, setDivision]   = useState([]);
  const [desig, setDesig]         = useState([]);
  const [topEmps, setTopEmps]     = useState([]);
  const [scatter, setScatter]     = useState([]);
  const [alerts, setAlerts]       = useState(null);
  const [empTrend, setEmpTrend]   = useState([]);

  // Summary KPIs derived from trend
  const totalPayout  = trend.reduce((s, d) => s + (d.total || 0), 0);
  const peakMonth    = trend.length ? trend.reduce((a, b) => b.total > a.total ? b : a, trend[0]) : null;
  const topDivision  = division[0] || null;
  const topEarner    = topEmps[0]  || null;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d, dg, te, sc, al, emps] = await Promise.all([
        axiosInstance.get(`/payroll/trend/?year=${year}`),
        axiosInstance.get(`/payroll/by-division/?year=${year}`),
        axiosInstance.get(`/payroll/by-designation/?year=${year}`),
        axiosInstance.get(`/payroll/top-employees/?year=${year}`),
        axiosInstance.get(`/payroll/scatter/?year=${year}`),
        axiosInstance.get(`/payroll/alerts/?year=${year}`),
        axiosInstance.get(`/employees/?limit=1000`),
      ]);
      setTrend(t.data);
      setDivision(d.data);
      setDesig(dg.data);
      setTopEmps(te.data);
      setScatter(sc.data);
      setAlerts(al.data);
      setEmployees(emps.data.results || emps.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [year]);

  const fetchEmpTrend = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/payroll/trend/${selectedEmployee}/?year=${year}`);
      setEmpTrend(res.data);
    } catch (e) { console.error(e); }
  }, [selectedEmployee, year]);

  useEffect(() => { 
    fetchAll(); 
  }, [fetchAll]);

  useEffect(() => {
    if (selectedEmployee) fetchEmpTrend();
    else setEmpTrend([]);
  }, [selectedEmployee, fetchEmpTrend]);

  const hasData = trend.length > 0 || division.length > 0;

  const fmt = (n) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Number(n).toFixed(0)}`;

  // ── Chart data ─────────────────────────────────────────────────────────
  const trendChartData = {
    labels: trend.map(d => d.month),
    datasets: [{
      data: trend.map(d => d.total),
      borderColor: C.blue,
      backgroundColor: "rgba(33,150,243,0.08)",
      fill: true, tension: 0.45,
      pointRadius: 4, pointBackgroundColor: C.blue,
      borderWidth: 2,
    }],
  };

  const divChartData = {
    labels: division.map(d => d.name),
    datasets: [{
      data: division.map(d => d.value),
      backgroundColor: C.divPalette,
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const topEmpsChartData = {
    labels: topEmps.map(d => d.name.split(" ")[0]),
    datasets: [{
      data: topEmps.map(d => d.total),
      backgroundColor: topEmps.map((_, i) =>
        i === 0 ? C.blue : i === 1 ? C.teal : "rgba(33,150,243,0.25)"
      ),
      borderRadius: 5,
      borderSkipped: false,
    }],
  };

  const desigChartData = {
    labels: desig.map(d => d.name),
    datasets: [{
      data: desig.map(d => d.value),
      backgroundColor: C.teal,
      borderRadius: 4,
      borderSkipped: false,
    }],
  };

  const scatterChartData = {
    datasets: [{
      label: "Employees",
      data: scatter.map(d => ({ x: d.hours, y: d.salary, name: d.name })),
      backgroundColor: C.amber + "cc",
      pointRadius: 6,
      pointHoverRadius: 8,
    }],
  };

  const empTrendChartData = {
    labels: empTrend.map(d => d.month),
    datasets: [{
      data: empTrend.map(d => d.total),
      borderColor: C.violet,
      backgroundColor: "rgba(124,58,237,0.08)",
      fill: true, tension: 0.4,
      pointRadius: 4, pointBackgroundColor: C.violet,
      borderWidth: 2,
    }],
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main pa-page">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="pa-header">
          <div>
            <h1 className="pa-title">Payroll Analytics</h1>
            <p className="pa-subtitle">Year-to-date compensation intelligence</p>
          </div>
          <div className="pa-header-controls">
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="pa-year-select"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="pa-loading">
            <div className="pa-spinner" />
            <span>Loading analytics…</span>
          </div>
        ) : !hasData ? (
          <div className="pa-empty">
            <div className="pa-empty-icon">📊</div>
            <h3>No payroll data for {year}</h3>
            <p>Generate payroll from the Monthly Payroll page first.</p>
          </div>
        ) : (
          <div className="pa-content">

            {/* ── KPI Strip ──────────────────────────────────────────── */}
            <div className="pa-kpi-row">
              <KpiTile
                icon="💰" label="Total Payout" accent={C.blue}
                value={fmt(totalPayout)}
                sub={`${trend.length} months recorded`}
              />
              <KpiTile
                icon="📈" label="Peak Month" accent={C.teal}
                value={peakMonth?.month || "—"}
                sub={peakMonth ? fmt(peakMonth.total) : ""}
              />
              <KpiTile
                icon="🏢" label="Top Division" accent={C.violet}
                value={topDivision?.name || "—"}
                sub={topDivision ? fmt(topDivision.value) : ""}
              />
              <KpiTile
                icon="🏆" label="Top Earner" accent={C.amber}
                value={topEarner?.name?.split(" ")[0] || "—"}
                sub={topEarner ? fmt(topEarner.total) : ""}
              />
              {alerts && <>
                <KpiTile icon="⚠️" label="High Salary" accent={C.rose}
                  value={alerts.high_salary} sub="> $2,000 threshold" />
                <KpiTile icon="🕐" label="Overtime" accent={C.amber}
                  value={alerts.overtime} sub="> 220 hrs" />
                <KpiTile icon="📉" label="Low Hours" accent={C.slate}
                  value={alerts.low_work} sub="< 80 hrs" />
              </>}
            </div>

            {/* ── Row 1: Trend (wide) + Doughnut ─────────────────────── */}
            <div className="pa-grid pa-grid-7-5">
              <ChartCard title="Monthly Payroll Trend" height={210}>
                <Line
                  data={trendChartData}
                  options={{
                    ...baseChartOpts,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: ctx => ` $${Number(ctx.raw).toLocaleString()}`,
                        },
                      },
                    },
                  }}
                />
              </ChartCard>

              <ChartCard title="Cost by Division" height={210}>
                <div className="pa-donut-wrap">
                  <div className="pa-donut-chart">
                    <Doughnut
                      data={divChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: "68%",
                        animation: { duration: 600 },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: ctx => ` $${Number(ctx.raw).toLocaleString()}`,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="pa-donut-legend">
                    {division.slice(0, 6).map((d, i) => (
                      <div key={i} className="pa-legend-item">
                        <span className="pa-legend-dot" style={{ background: C.divPalette[i] }} />
                        <span className="pa-legend-name">{d.name}</span>
                        <span className="pa-legend-val">{fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* ── Row 2: Top Earners + Designation ───────────────────── */}
            <div className="pa-grid pa-grid-5-7">
              <ChartCard title="Top 5 Earners" height={200}>
                <Bar
                  data={topEmpsChartData}
                  options={{
                    ...baseChartOpts,
                    indexAxis: "y",
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: { label: ctx => ` $${Number(ctx.raw).toLocaleString()}` },
                      },
                    },
                    scales: {
                      x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 11 }, color: "#9aa5b4" } },
                      y: { grid: { display: false }, ticks: { font: { size: 12, weight: "600" }, color: "#2d3748" } },
                    },
                  }}
                />
              </ChartCard>

              <ChartCard title="Salary by Designation" height={200}>
                <Bar
                  data={desigChartData}
                  options={{
                    ...baseChartOpts,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: { label: ctx => ` $${Number(ctx.raw).toLocaleString()}` },
                      },
                    },
                  }}
                />
              </ChartCard>
            </div>

            {/* ── Row 3: Employee Trend + Scatter ────────────────────── */}
            <div className="pa-grid pa-grid-6-6">
              <ChartCard
                title="Employee Salary Trend"
                height={190}
                action={
                  <select
                    className="pa-emp-select"
                    value={selectedEmployee}
                    onChange={e => setSelectedEmployee(e.target.value)}
                  >
                    <option value="">Select employee…</option>
                    {employees.map(emp => (
                      <option key={emp.emp_id} value={emp.emp_id}>
                        {emp.name} ({emp.emp_id})
                      </option>
                    ))}
                  </select>
                }
              >
                {selectedEmployee && empTrend.length > 0 ? (
                  <Line
                    data={empTrendChartData}
                    options={{
                      ...baseChartOpts,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: { label: ctx => ` $${Number(ctx.raw).toLocaleString()}` },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="pa-placeholder">
                    {selectedEmployee ? "No data for this employee" : "Select an employee above"}
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Hours vs Salary" height={190}>
                <Scatter
                  data={scatterChartData}
                  options={{
                    ...baseChartOpts,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: ctx => `${ctx.raw.name}: ${ctx.raw.x}h · $${Number(ctx.raw.y).toLocaleString()}`,
                        },
                      },
                    },
                    scales: {
                      x: { title: { display: true, text: "Hours", font: { size: 11 }, color: "#9aa5b4" }, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 11 }, color: "#9aa5b4" } },
                      y: { title: { display: true, text: "Salary ($)", font: { size: 11 }, color: "#9aa5b4" }, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 11 }, color: "#9aa5b4" } },
                    },
                  }}
                />
              </ChartCard>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default PayrollAnalytics;