import React from "react";

function SummaryCards({ summary }) {
  return (
    <div className="summary-cards-container">
      <div className="summary-card">
        <div className="summary-icon leave-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div className="summary-content">
          <p className="summary-title">Leave Balance</p>
          <h3 className="summary-value">{summary.leave_balance} <span className="summary-unit">Days</span></h3>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon pending-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="summary-content">
          <p className="summary-title">Pending Requests</p>
          <h3 className="summary-value">{summary.pending_requests}</h3>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon upcoming-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div className="summary-content">
          <p className="summary-title">Upcoming Leaves</p>
          <h3 className="summary-value">{summary.upcoming_leaves}</h3>
        </div>
      </div>
    </div>
  );
}

export default SummaryCards;
