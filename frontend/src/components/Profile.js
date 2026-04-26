import { useEffect, useState } from "react";
import api from "../axiosInstance";
import "./Profile.css";

function Profile() {
  const [data, setData] = useState(null);

  // ── Fetch employee ───────────────────────────────────────
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.emp_id) return;
    api
      .get(`employees/${user.emp_id}/`)
      .then((res) => setData(res.data))
      .catch((err) => console.log(err));
  }, []);

  if (!data) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-spinner" />
        Loading profile...
      </div>
    );
  }

  // helper
  const val = (v) =>
    v !== null && v !== undefined && v !== "" ? (
      v
    ) : (
      <span className="profile-field-value empty">—</span>
    );

  const initials = (data.name || "E")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="profile-page">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-hero-info">
          <h1>{data.name}</h1>
          <div className="profile-hero-badges">
            <span className="hero-badge">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              {data.division}
            </span>
            <span className="hero-badge">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              ID: {data.emp_id}
            </span>
            <span className={`hero-badge status-${data.status?.toLowerCase()}`}>
              {data.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sections ─────────────────────────────────────── */}
      <div className="profile-sections">
        {/* Personal */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-header-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="profile-card-title">Personal Info</span>
          </div>
          <div className="profile-grid">
            {[
              ["Phone", val(data.phone)],
              ["Nationality", val(data.nationality)],
              ["Date of Birth", val(data.dob)],
            ].map(([label, value]) => (
              <div key={label} className="profile-field">
                <div className="profile-field-label">{label}</div>
                <div className="profile-field-value">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Designation & Salary */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-header-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <span className="profile-card-title">Designation & Salary</span>
          </div>
          <div className="profile-grid">
            {[
              ["IPA Designation", val(data.designation_ipa)],
              ["Aug Designation", val(data.designation_aug)],
              ["IPA Salary", val(data.ipa_salary)],
              ["Per Hour", val(data.per_hr)],
              [
                "Salary",
                <span className="profile-field-value salary">
                  {data.salary || "—"}
                </span>,
              ],
              ["Bank Account", val(data.bank_account)],
            ].map(([label, value]) => (
              <div key={label} className="profile-field">
                <div className="profile-field-label">{label}</div>
                <div className="profile-field-value">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Work Permit */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-header-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="profile-card-title">Work Permit</span>
          </div>
          <div className="profile-grid">
            {[
              [
                "Work Permit No",
                <span className="profile-field-value mono">
                  {data.work_permit_no || "—"}
                </span>,
              ],
              ["WP Expiry", val(data.wp_expiry)],
              [
                "FIN No",
                <span className="profile-field-value mono">
                  {data.fin_no || "—"}
                </span>,
              ],
              ["Issue Date", val(data.issue_date)],
              ["IC Status", val(data.ic_status)],
            ].map(([label, value]) => (
              <div key={label} className="profile-field">
                <div className="profile-field-label">{label}</div>
                <div className="profile-field-value">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Passport */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-header-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <span className="profile-card-title">Passport</span>
          </div>
          <div className="profile-grid">
            {[
              [
                "Passport No",
                <span className="profile-field-value mono">
                  {data.passport_no || "—"}
                </span>,
              ],
              ["Expiry Date", val(data.passport_expiry)],
              ["Issue Place", val(data.passport_issue_place)],
            ].map(([label, value]) => (
              <div key={label} className="profile-field">
                <div className="profile-field-label">{label}</div>
                <div className="profile-field-value">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Remarks */}
        {data.remarks && (
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-header-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <span className="profile-card-title">Remarks</span>
            </div>
            <div className="profile-grid">
              <div className="profile-field" style={{ gridColumn: "1 / -1" }}>
                <div className="profile-field-value">{data.remarks}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
