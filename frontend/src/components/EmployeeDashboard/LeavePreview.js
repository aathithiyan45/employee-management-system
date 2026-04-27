import React from "react";
import { Link } from "react-router-dom";

function LeavePreview({ recentLeaves }) {
  return (
    <div className="leave-preview-section">
      <div className="section-header">
        <h3 className="section-title">Recent Leaves</h3>
        {/* Placeholder link for applying leave, could map to a specific apply leave page or modal */}
        <Link to="/profile" className="btn-primary btn-sm">Apply Leave</Link>
      </div>

      {recentLeaves && recentLeaves.length > 0 ? (
        <div className="recent-leaves-list">
          {recentLeaves.map((leave) => (
            <div key={leave.id} className="leave-item">
              <div className="leave-info">
                <p className="leave-type">{leave.type}</p>
                <p className="leave-dates">{leave.start_date} to {leave.end_date} • {leave.total_days} Days</p>
              </div>
              <div className={`leave-status status-${leave.status.toLowerCase()}`}>
                {leave.status}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No recent leave requests found.</p>
        </div>
      )}
    </div>
  );
}

export default LeavePreview;
