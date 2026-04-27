import React from "react";
import { Link } from "react-router-dom";

function ProfileCard({ user }) {
  return (
    <div className="profile-preview-card">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.name ? user.name.charAt(0).toUpperCase() : "E"}
        </div>
        <div className="profile-info-short">
          <h4 className="profile-name">{user.name}</h4>
          <p className="profile-id">{user.emp_id}</p>
        </div>
      </div>
      
      <div className="profile-details-short">
        <div className="detail-row">
          <span className="detail-label">Designation</span>
          <span className="detail-value">{user.role}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Division</span>
          <span className="detail-value">{user.division}</span>
        </div>
      </div>

      <div className="profile-actions">
        <Link to="/profile" className="btn-secondary btn-block text-center">
          View Full Profile
        </Link>
      </div>
    </div>
  );
}

export default ProfileCard;
