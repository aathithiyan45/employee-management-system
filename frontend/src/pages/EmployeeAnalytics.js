import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../axiosInstance";
import Sidebar from "../components/Sidebar";
import "./PayrollAnalytics.css"; // Reuse the same premium styles
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

const C = {
  blue:    "#2196F3",
  teal:    "#00ACC1",
  green:   "#2e7d32",
  amber:   "#f59e0b",
  rose:    "#e11d48",
  violet:  "#7c3aed",
  sky:     "#0ea5e9",
  slate:   "#64748b",
  palette: ["#2196F3","#00ACC1","#7c3aed","#f59e0b","#e11d48","#2e7d32","#0ea5e9"],
};

const baseChartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 11 }, color: "#9aa5b4" } },
    y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 11 }, color: "#9aa5b4" } },
  },
};

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

function ChartCard({ title, height = 220, children }) {
  return (
    <div className="pa-card">
      <div className="pa-card-head"><span className="pa-card-title">{title}</span></div>
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
      <main className="dashboard-main pa-page">
        <div className="pa-loading"><div className="pa-spinner" /><span>Loading Employee Analytics…</span></div>
      </main>
    </div>
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main pa-page">
        <div className="pa-header">
          <div>
            <h1 className="pa-title">Employee Analytics</h1>
            <p className="pa-subtitle">Workforce demographics and document compliance</p>
          </div>
        </div>

        <div className="pa-content">
          <div className="pa-kpi-row">
            <KpiTile icon="👥" label="Total Workforce" accent={C.blue} value={summary?.total} sub={`${summary?.active} Active Employees`} />
            <KpiTile icon="🛡️" label="WP Expiring (60d)" accent={C.amber} value={expiry?.wp_60} sub={`${expiry?.wp_30} within 30 days`} />
            <KpiTile icon="🛂" label="Passport Alerts" accent={C.rose} value={expiry?.pp_90} sub={`${expiry?.pp_30} critical`} />
            <KpiTile icon="📈" label="Active Ratio" accent={C.teal} value={summary?.total ? Math.round((summary.active/summary.total)*100) + "%" : "0%"} sub="Employment stability" />
          </div>

          <div className="pa-grid pa-grid-7-5">
            <ChartCard title="Hiring Trend (Last 5 Years)">
              <Bar 
                data={{
                  labels: hiring.map(x => x.year),
                  datasets: [{ data: hiring.map(x => x.count), backgroundColor: C.blue, borderRadius: 6 }]
                }} 
                options={baseChartOpts}
              />
            </ChartCard>
            <ChartCard title="Division Distribution">
              <Doughnut 
                data={{
                  labels: division.map(x => x.name),
                  datasets: [{ data: division.map(x => x.value), backgroundColor: C.palette, borderWidth: 0 }]
                }}
                options={{ ...baseChartOpts, cutout: "70%" }}
              />
            </ChartCard>
          </div>

          <div className="pa-grid pa-grid-6-6">
            <ChartCard title="Top Nationalities">
              <Bar 
                data={{
                  labels: nationality.map(x => x.name),
                  datasets: [{ data: nationality.map(x => x.value), backgroundColor: C.teal, borderRadius: 4 }]
                }}
                options={{ ...baseChartOpts, indexAxis: 'y' }}
              />
            </ChartCard>
            <ChartCard title="Top Designations">
              <Bar 
                data={{
                  labels: designation.map(x => x.name),
                  datasets: [{ data: designation.map(x => x.value), backgroundColor: C.violet, borderRadius: 4 }]
                }}
                options={{ ...baseChartOpts, indexAxis: 'y' }}
              />
            </ChartCard>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EmployeeAnalytics;
