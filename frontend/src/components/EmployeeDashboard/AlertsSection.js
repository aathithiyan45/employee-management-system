import React from "react";

function AlertsSection({ documents }) {
  if (!documents.passport_expiring && !documents.wp_expiring) {
    return null;
  }

  return (
    <div className="alerts-section">
      <h3 className="section-title">
        <span className="alert-badge">🔔</span> Important Alerts
      </h3>
      <div className="alerts-list">
        {documents.wp_expiring && (
          <div className="alert-item warning">
            <div className="alert-icon">⚠️</div>
            <div className="alert-text">
              <strong>Work Permit Expiring Soon:</strong> Please contact HR for renewal.
            </div>
          </div>
        )}
        {documents.passport_expiring && (
          <div className="alert-item error">
            <div className="alert-icon">❗</div>
            <div className="alert-text">
              <strong>Passport Expiring Soon:</strong> Please ensure your passport is renewed.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsSection;
