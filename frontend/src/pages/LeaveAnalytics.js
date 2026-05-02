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
  palette: ["#7c3aed","#00ACC1","#2196F3","#f59e0b","#e11d48","#2e7d32","#0ea5e9"],
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

function LeaveAnalytics() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [summary, setSummary] = useState(null);
  const [byType, setByType] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [byDivision, setByDivision] = useState([]);
  const [status, setStatus] = useState([]);

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
      fetchItem(`leave/analytics/summary/?year=${year}`, setSummary),
      fetchItem(`leave/analytics/type/?year=${year}`, setByType),
      fetchItem(`leave/analytics/month/?year=${year}`, setByMonth),
      fetchItem(`leave/analytics/division/?year=${year}`, setByDivision),
      fetchItem(`leave/analytics/status/?year=${year}`, setStatus),
    ]);

    setLoading(false);
  }, [year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main pa-page">
        <div className="pa-loading"><div className="pa-spinner" /><span>Loading Leave Analytics…</span></div>
      </main>
    </div>
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main pa-page">
        <div className="pa-header">
          <div>
            <h1 className="pa-title">Leave Analytics</h1>
            <p className="pa-subtitle">Absence trends and approval efficiency</p>
          </div>
          <div className="pa-header-controls">
            <select value={year} onChange={e => setYear(e.target.value)} className="pa-year-select">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="pa-content">
          <div className="pa-kpi-row">
            <KpiTile icon="📅" label="Total Requests" accent={C.violet} value={summary?.total} sub={`${year} Calendar Year`} />
            <KpiTile icon="✅" label="Approval Rate" accent={C.green} value={summary?.approval_rate + "%"} sub={`${summary?.approved} Approved`} />
            <KpiTile icon="⏳" label="Pending" accent={C.amber} value={summary?.pending} sub="Requires Review" />
            <KpiTile icon="⏱️" label="Avg Duration" accent={C.blue} value={summary?.avg_days + " Days"} sub="Per approved request" />
          </div>

          <div className="pa-grid pa-grid-7-5">
            <ChartCard title="Requests by Month">
              <Bar 
                data={{
                  labels: byMonth.map(x => x.month),
                  datasets: [{ data: byMonth.map(x => x.count), backgroundColor: C.violet, borderRadius: 6 }]
                }} 
                options={baseChartOpts}
              />
            </ChartCard>
            <ChartCard title="Leave Type Breakdown">
              <Doughnut 
                data={{
                  labels: byType.map(x => x.name),
                  datasets: [{ data: byType.map(x => x.value), backgroundColor: C.palette, borderWidth: 0 }]
                }}
                options={{ ...baseChartOpts, cutout: "70%" }}
              />
            </ChartCard>
          </div>

          <div className="pa-grid pa-grid-6-6">
            <ChartCard title="Requests by Division">
              <Bar 
                data={{
                  labels: byDivision.map(x => x.name),
                  datasets: [{ data: byDivision.map(x => x.value), backgroundColor: C.teal, borderRadius: 4 }]
                }}
                options={{ ...baseChartOpts, indexAxis: 'y' }}
              />
            </ChartCard>
            <ChartCard title="Approval Status">
              <Doughnut 
                data={{
                  labels: status.map(x => x.name),
                  datasets: [{ data: status.map(x => x.value), backgroundColor: [C.green, C.amber, C.rose], borderWidth: 0 }]
                }}
                options={{ ...baseChartOpts, cutout: "70%" }}
              />
            </ChartCard>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LeaveAnalytics;
