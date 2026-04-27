import React from "react";

function DashboardHeader({ user }) {
  return (
    <div className="employee-dashboard-header">
      <div className="header-info">
        <h1 className="welcome-title">Welcome back, {user.name} 👋</h1>
        <p className="welcome-subtitle">
          {user.role} • {user.division} • ID: {user.emp_id}
        </p>
      </div>
    </div>
  );
}

export default DashboardHeader;
