import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import DashboardHeader from "../components/EmployeeDashboard/DashboardHeader";
import SummaryCards from "../components/EmployeeDashboard/SummaryCards";
import AlertsSection from "../components/EmployeeDashboard/AlertsSection";
import LeavePreview from "../components/EmployeeDashboard/LeavePreview";
import ProfileCard from "../components/EmployeeDashboard/ProfileCard";
import "./EmployeeDashboard.css";

function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/employee-dashboard/");
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching employee dashboard:", err);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="employee-dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="employee-dashboard-error">
        <div className="error-icon">⚠️</div>
        <h3>Oops! Something went wrong.</h3>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="employee-dashboard-page fade-in">
      <div className="dashboard-container">
        
        <DashboardHeader user={data.user} />
        
        <AlertsSection documents={data.documents} />

        <SummaryCards summary={data.summary} />

        <div className="dashboard-grid">
          <div className="dashboard-main-column">
            <LeavePreview recentLeaves={data.recent_leaves} />
          </div>
          <div className="dashboard-side-column">
            <ProfileCard user={data.user} />
          </div>
        </div>

      </div>
    </div>
  );
}

export default EmployeeDashboard;
