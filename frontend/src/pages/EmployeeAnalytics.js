import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./EmployeeAnalytics.css";
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
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ── Premium Colors ─────────────────────────────────────────
const C = {
  blue:    "#4f46e5", // Brand Violet
  teal:    "#0ea5e9", // Brand Sky
  green:   "#10b981", // Success Green
  amber:   "#f59e0b", // Warning Yellow
  rose:    "#f43f5e", // Critical Red
  violet:  "#8b5cf6", // Lavender Accent
  slate:   "#64748b", // Muted Slate
  palette: ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#64748b"]
};

// ── Vector Icon Helper ─────────────────────────────────────
const Icon = ({ d, size = 18, stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

const baseChartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }
};

const verticalBarOpts = {
  ...baseChartOpts,
  scales: {
    x: { 
      grid: { display: false }, 
      ticks: { font: { size: 10, family: "var(--font)" }, color: "#9aa5b4" } 
    },
    y: { 
      grid: { color: "rgba(0,0,0,0.04)" }, 
      ticks: { 
        font: { size: 10, family: "var(--font)" }, 
        color: "#9aa5b4",
        precision: 0,
        stepSize: 1,
        beginAtZero: true
      } 
    },
  },
};

const horizontalBarOpts = {
  ...baseChartOpts,
  indexAxis: 'y',
  scales: {
    x: { 
      grid: { color: "rgba(0,0,0,0.04)" }, 
      ticks: { 
        font: { size: 10, family: "var(--font)" }, 
        color: "#9aa5b4",
        precision: 0,
        stepSize: 1,
        beginAtZero: true
      } 
    },
    y: { 
      grid: { display: false }, 
      ticks: { 
        font: { size: 10, weight: "600", family: "var(--font)" }, 
        color: "#475569" 
      } 
    },
  },
};

function KpiTile({ label, value, sub, accent, icon }) {
  return (
    <div className="ea-kpi" style={{ "--accent": accent }}>
      <div className="ea-kpi-icon" style={{ color: accent, background: `${accent}10` }}>
        {icon}
      </div>
      <div className="ea-kpi-body">
        <div className="ea-kpi-value">{value}</div>
        <div className="ea-kpi-label">{label}</div>
        {sub && <div className="ea-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, height = 220, children }) {
  return (
    <div className="ea-card">
      <div className="ea-card-head">
        <span className="ea-card-title">{title}</span>
      </div>
      <div style={{ height, position: "relative" }}>{children}</div>
    </div>
  );
}

function EmployeeAnalytics() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [division, setDivision] = useState([]);
  const [nationality, setNationality] = useState([]);
  const [designation, setDesignation] = useState([]);
  const [hiring, setHiring] = useState([]);
  const [expiry, setExpiry] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    
    const fetchItem = async (url, setter) => {
      try {
        const res = await axiosInstance.get(url);
        setter(res.data);
      } catch (err) {
        console.error(`Failed to fetch ${url}:`, err);
      }
    };

    await Promise.all([
      fetchItem("employees/analytics/summary/", setSummary),
      fetchItem("employees/analytics/division/", setDivision),
      fetchItem("employees/analytics/nationality/", setNationality),
      fetchItem("employees/analytics/designation/", setDesignation),
      fetchItem("employees/analytics/hiring/", setHiring),
      fetchItem("employees/analytics/expiry/", setExpiry),
    ]);
    
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main ea-page">
        <div className="ea-loading">
          <div className="ea-spinner" />
          <span>Loading Employee Analytics…</span>
        </div>
      </main>
    </div>
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main ea-page">
        <div className="ea-header">
          <div>
            <h1 className="ea-title">Employee Analytics</h1>
            <p className="ea-subtitle">Workforce demographics and document compliance</p>
          </div>
        </div>

        <div className="ea-content">
          <div className="ea-kpi-row">
            <KpiTile 
              icon={<Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={C.blue} />} 
              label="Total Workforce" 
              accent={C.blue} 
              value={summary?.total || 0} 
              sub={`${summary?.active || 0} Active Employees`} 
            />
            <KpiTile 
              icon={<Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={C.amber} />} 
              label="WP Expiring (60d)" 
              accent={C.amber} 
              value={expiry?.wp_60 || 0} 
              sub={`${expiry?.wp_30 || 0} within 30 days`} 
            />
            <KpiTile 
              icon={<Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" stroke={C.rose} />} 
              label="Passport Alerts" 
              accent={C.rose} 
              value={expiry?.pp_90 || 0} 
              sub={`${expiry?.pp_30 || 0} critical`} 
            />
            <KpiTile 
              icon={<Icon d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" stroke={C.teal} />} 
              label="Active Ratio" 
              accent={C.teal} 
              value={summary?.total ? Math.round((summary.active/summary.total)*100) + "%" : "0%"} 
              sub="Employment stability" 
            />
          </div>

          <div className="ea-grid ea-grid-7-5">
            <ChartCard title="Hiring Trend (Last 5 Years)" height={210}>
              <Bar 
                data={{
                  labels: hiring.map(x => x.year),
                  datasets: [{ data: hiring.map(x => x.count), backgroundColor: C.blue, borderRadius: 6 }]
                }} 
                options={verticalBarOpts}
              />
            </ChartCard>
            
            <ChartCard title="Division Distribution" height={210}>
              <div className="ea-donut-wrap">
                <div className="ea-donut-chart">
                  <Doughnut 
                    data={{
                      labels: division.map(x => x.name),
                      datasets: [{ data: division.map(x => x.value), backgroundColor: C.palette, borderWidth: 0, hoverOffset: 4 }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "70%",
                      plugins: { legend: { display: false } }
                    }}
                  />
                </div>
                <div className="ea-donut-legend">
                  {division.slice(0, 5).map((d, i) => (
                    <div key={i} className="ea-legend-item">
                      <span className="ea-legend-dot" style={{ background: C.palette[i % C.palette.length] }} />
                      <span className="ea-legend-name">{d.name}</span>
                      <span className="ea-legend-val">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="ea-grid ea-grid-6-6">
            <ChartCard title="Top Nationalities" height={210}>
              <Bar 
                data={{
                  labels: nationality.map(x => x.name),
                  datasets: [{ data: nationality.map(x => x.value), backgroundColor: C.teal, borderRadius: 4 }]
                }}
                options={horizontalBarOpts}
              />
            </ChartCard>
            <ChartCard title="Top Designations" height={210}>
              <Bar 
                data={{
                  labels: designation.map(x => x.name),
                  datasets: [{ data: designation.map(x => x.value), backgroundColor: C.violet, borderRadius: 4 }]
                }}
                options={horizontalBarOpts}
              />
            </ChartCard>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EmployeeAnalytics;
