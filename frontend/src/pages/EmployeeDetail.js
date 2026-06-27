import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../axiosInstance";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import "./EmployeeDetail.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// ── 1. LUCIDE REACT SVG ICON COMPONENT ──────────────────
function Icon({ name, size = 16, stroke = "currentColor", fill = "none" }) {
  const icons = {
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    briefcase: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
    shieldCheck: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 11 2 2 4-4" />
      </>
    ),
    badgeCheck: (
      <>
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.75z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </>
    ),
    wallet: (
      <>
        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    clock3: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    edit: (
      <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    ),
    print: (
      <>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    )
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      {icons[name] || null}
    </svg>
  );
}

function EmployeeDetail() {
  const { empId } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Load user info
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
  }, []);

  // Fetch employee details, payroll trends, and uploaded documents
  useEffect(() => {
    setLoading(true);
    const fetches = [
      api.get(`employees/${empId}/`),
      api.get(`payroll/?employee_id=${empId}`),
      api.get(`documents/${empId}/`).catch(err => {
        console.error("Error fetching documents:", err);
        return { data: [] };
      })
    ];

    Promise.all(fetches)
      .then(([empRes, payrollRes, docsRes]) => {
        setEmp(empRes.data);
        const fetchedPayrolls = payrollRes.data.results || payrollRes.data || [];
        const sorted = fetchedPayrolls.sort((a, b) => new Date(a.month) - new Date(b.month));
        setPayrolls(sorted);
        setDocuments(docsRes.data || []);
        setError(null);
      })
      .catch((err) => {
        console.error("Error fetching employee details:", err);
        setError("Employee not found");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [empId]);

  // Fetch and filter related audit activities
  useEffect(() => {
    if (!emp || !user || user.role !== "admin") return;

    const fetchActivities = async () => {
      try {
        setActivitiesLoading(true);
        const res = await api.get("audit-logs/?page_size=150");
        const logs = res.data.results || res.data || [];
        const related = logs.filter(log => {
          const metaStr = JSON.stringify(log.metadata || {}).toLowerCase();
          const matchEmpId = emp.emp_id ? metaStr.includes(emp.emp_id.toLowerCase()) : false;
          const matchName = emp.name ? metaStr.includes(emp.name.toLowerCase()) : false;
          return matchEmpId || matchName;
        });
        setActivities(related.slice(0, 10));
      } catch (err) {
        console.error("Error loading activities:", err);
      } finally {
        setActivitiesLoading(false);
      }
    };

    fetchActivities();
  }, [emp, user]);

  const handleDownloadDoc = (docId, fileName) => {
    api.get(`documents/${docId}/download/`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName || 'document.pdf');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("Failed to download document:", err);
      });
  };

  const handlePreviewDoc = (docId) => {
    api.get(`documents/${docId}/preview/`, { responseType: 'blob' })
      .then((res) => {
        const file = new Blob([res.data], { type: res.headers['content-type'] });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
      })
      .catch((err) => {
        console.error("Failed to preview document:", err);
      });
  };

  const val = (v) => (v !== null && v !== undefined && v !== "" ? v : "—");

  if (loading)
    return (
      <div className="detail-loading">
        <div className="detail-spinner" />
        <p>Loading employee data...</p>
      </div>
    );

  if (error)
    return (
      <div className="detail-loading">
        <p className="detail-error">{error}</p>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    );

  const isActive = emp.status?.toLowerCase() === "active";

  // Scan expiry alerts
  const getCriticalExpiries = () => {
    const expiries = [];
    const today = new Date();
    const checkExpiry = (dateStr, label) => {
      if (!dateStr) return;
      const d = new Date(dateStr);
      const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        expiries.push({ label, status: "expired", date: dateStr, diff: diffDays });
      } else if (diffDays <= 30) {
        expiries.push({ label, status: "expiring", date: dateStr, diff: diffDays });
      }
    };
    
    checkExpiry(emp.wp_expiry, "Work Permit");
    checkExpiry(emp.passport_expiry, "Passport");
    checkExpiry(emp.security_bond_exp, "Security Bond");
    checkExpiry(emp.ssic_gt_exp, "SSIC General Trade");
    checkExpiry(emp.ssic_ht_exp, "SSIC Hot Work");
    checkExpiry(emp.dynamac_pass_exp, "Dynamac Pass");
    
    return expiries;
  };
  
  const criticalExpiries = getCriticalExpiries();

  // Chart configuration (rendered only if at least 3 historical records are present)
  const showChart = payrolls.length >= 3;

  const chartData = {
    labels: payrolls.map(p => {
      const dateObj = new Date(p.month);
      return dateObj.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }),
    datasets: [
      {
        label: "Total Paid ($)",
        data: payrolls.map(p => parseFloat(p.total_salary)),
        borderColor: "var(--theme-600, #4f46e5)",
        backgroundColor: "rgba(79, 70, 229, 0.04)",
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "var(--theme-600, #4f46e5)",
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "var(--theme-600, #4f46e5)",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#f8fafc",
        padding: 8,
        borderRadius: 6,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "var(--grey-400)", font: { size: 10 } }
      },
      y: {
        grid: { color: "var(--grey-100)" },
        ticks: { color: "var(--grey-400)", font: { size: 10 } }
      }
    }
  };

  const certsList = [
    { label: "Work At Height", value: emp.work_at_height },
    { label: "Confined Space", value: emp.confined_space },
    { label: "Signalman / Rigger", value: emp.signalman_rigger },
    { label: "Firewatchman", value: emp.firewatchman },
    { label: "Gas Meter Carrier", value: emp.gas_meter_carrier }
  ];

  // Activities logs formatted into Day Groups
  const getTimelineGroup = (dateStr) => {
    if (!dateStr) return "Recent";
    const today = new Date();
    const actDate = new Date(dateStr);
    
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const actZero = new Date(actDate.getFullYear(), actDate.getMonth(), actDate.getDate());
    const diffDays = Math.round((todayZero - actZero) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    
    return actDate.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  return (
    <div className="detail-page">
      {/* ── 1. STICKY TOP ACTIONS BAR ────────────────────────── */}
      <div className="detail-sticky-bar no-print">
        <button className="btn-back-pill" onClick={() => navigate("/employees")}>
          <Icon name="user" size={14} stroke="var(--grey-600)" />
          Back to List
        </button>
        
        <div className="detail-sticky-actions">
          <button className="btn-action-outline" onClick={() => window.print()}>
            <Icon name="print" size={14} />
            Print Profile
          </button>
          <button className="btn-action-outline" onClick={() => window.print()}>
            <Icon name="download" size={14} />
            Export PDF
          </button>
          {user?.role === "admin" && (
            <button className="btn-action-primary" onClick={() => navigate(`/employees/${emp.emp_id}/profile`)}>
              <Icon name="edit" size={14} stroke="#fff" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* ── 2. HERO HEADER SECTION ───────────────────────────── */}
      <div className="profile-header-card">
        <div className="profile-header-main">
          <div className="employee-avatar-large">
            {emp.name?.charAt(0).toUpperCase()}
          </div>
          <div className="profile-identity">
            <div className="profile-name-row">
              <h1>{emp.name}</h1>
              <span className={`status-badge-pill ${isActive ? "active" : "inactive"}`}>
                <span className="badge-dot" />
                {emp.status}
              </span>
            </div>
            <p className="profile-meta-subtext">
              <strong>{emp.designation_ipa || emp.designation_aug || "Employee"}</strong>
              <span className="meta-separator">•</span>
              <span>{emp.division}</span>
              <span className="meta-separator">•</span>
              <span className="profile-sub-id">ID: {emp.emp_id}</span>
            </p>
          </div>
        </div>
        
        <div className="profile-header-side">
          <div className="meta-quick-info">
            <span className="quick-info-label">Nationality</span>
            <span className="quick-info-value">{emp.nationality || "—"}</span>
          </div>
          <div className="meta-quick-info">
            <span className="quick-info-label">Joined</span>
            <span className="quick-info-value">{emp.doa || "—"}</span>
          </div>
        </div>
      </div>

      {/* ── 3. CRITICAL EXPIRY BANNERS ───────────────────────── */}
      {criticalExpiries.length > 0 && (
        <div className="profile-expiry-banners-group no-print">
          {criticalExpiries.map((exp, idx) => (
            <div key={idx} className={`profile-expiry-banner-card ${exp.status}`}>
              <div className="banner-icon">
                {exp.status === "expired" ? "⚠️" : "🔔"}
              </div>
              <div className="banner-body">
                <div className="banner-title">
                  {exp.label} {exp.status === "expired" ? "has Expired" : "is Expiring Soon"}
                </div>
                <div className="banner-desc">
                  {exp.status === "expired" 
                    ? `This critical document expired on ${exp.date}. Please renew it immediately.`
                    : `This critical document will expire on ${exp.date} (${exp.diff} days remaining).`
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. DETAILS PANELS CONTAINER ──────────────────────── */}
      <div className="detail-sections-container">
        
        {/* Basic Information */}
        <Section title="Basic Information" icon="user">
          <Field label="Employee ID" value={<span className="mono-val">{emp.emp_id}</span>} />
          <Field label="Phone Number" value={val(emp.phone)} />
          <Field label="Nationality" value={val(emp.nationality)} />
          <Field label="Date of Birth" value={val(emp.dob)} />
          
          <Field label="Gender" value={val(emp.gender)} />
          <Field label="Email" value={val(emp.email)} />
          <Field label="Blood Group" value={val(emp.blood_group)} />
          <Field label="Marital Status" value={val(emp.marital_status)} />
        </Section>

        {/* Employment Details */}
        <Section title="Employment Details" icon="briefcase">
          <Field label="Date of Joining" value={val(emp.doa)} />
          <Field label="Arrival Date" value={val(emp.arrival_date)} />
          <Field label="Company Join Date" value={val(emp.date_joined_company)} />
          <Field label="Experience Years" value={val(emp.experience_years)} />
          <Field label="Accommodation" value={val(emp.accommodation)} />
          <Field label="PCP Status" value={val(emp.pcp_status)} />
          <Field label="Division" value={val(emp.division)} />
          <Field label="Work Status" value={<span className={`status-badge-pill ${isActive ? "active" : "inactive"}`}>{emp.status}</span>} />
        </Section>

        {/* Work Permit Details */}
        <Section title="Work Permit Details" icon="shieldCheck">
          <Field label="Work Permit No" value={val(emp.work_permit_no)} />
          <Field label="FIN No" value={val(emp.fin_no)} />
          <Field label="Issue Date" value={val(emp.issue_date)} />
          <Field label="WP Expiry" value={<ExpiryVal date={emp.wp_expiry} />} />
          <Field label="IC Status" value={val(emp.ic_status)} />
        </Section>

        {/* Passport details */}
        <Section title="Passport Details" icon="badgeCheck">
          <Field label="Passport No" value={val(emp.passport_no)} />
          <Field label="Passport Expiry" value={<ExpiryVal date={emp.passport_expiry} />} />
          <Field label="Passport Issue Date" value={val(emp.passport_issue_date)} />
          <Field label="Passport Issue Place" value={val(emp.passport_issue_place)} />
        </Section>

        {/* Security Bond Details */}
        <Section title="Security Bond Details" icon="shieldCheck">
          <Field label="Bond No" value={val(emp.security_bond_no)} />
          <Field label="Bond Expiry" value={<ExpiryVal date={emp.security_bond_exp} />} />
        </Section>

        {/* Documents */}
        <Section title="Documents" icon="fileText" wide>
          {documents.length > 0 ? (
            <div className="documents-cards-grid">
              {documents.map((doc) => {
                let statusClass = "valid";
                let statusText = "Valid";
                if (doc.is_expired) {
                  statusClass = "expired";
                  statusText = "Expired";
                } else if (doc.is_expiring_soon) {
                  statusClass = "expiring";
                  statusText = "Expiring Soon";
                }
                return (
                  <div key={doc.id} className="document-file-card" onClick={() => handlePreviewDoc(doc.id)}>
                    <div className="doc-icon-wrapper">
                      <Icon name="fileText" size={18} stroke="var(--theme-600)" />
                    </div>
                    <div className="doc-card-details">
                      <div className="doc-card-title" title={doc.label}>{doc.label}</div>
                      <div className="doc-card-meta">
                        <span>By {doc.uploaded_by}</span>
                        <span className="bullet">•</span>
                        <span>{doc.uploaded_at}</span>
                      </div>
                      {doc.expiry_date && (
                        <div className="doc-card-expiry">
                          Expires: {doc.expiry_date}
                        </div>
                      )}
                    </div>
                    <div className="doc-card-actions">
                      <span className={`doc-status-badge ${statusClass}`}>{statusText}</span>
                      <button className="doc-btn-download" onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDoc(doc.id, doc.file_name);
                      }} title="Download File">
                        <Icon name="download" size={12} stroke="var(--grey-600)" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state-card">
              <div className="empty-icon-wrap">
                <Icon name="fileText" size={24} stroke="var(--grey-400)" />
              </div>
              <h5>No documents uploaded</h5>
              <p>Upload documents to manage employee records.</p>
            </div>
          )}
        </Section>

        {/* Certifications */}
        <Section title="Certifications & Skills" icon="award" wide>
          <div className="certs-display-grid">
            <div className="certs-left-block">
              <Field label="SSIC GT S/N" value={val(emp.ssic_gt_sn)} />
              <Field label="SSIC GT Expiry" value={<ExpiryVal date={emp.ssic_gt_exp} />} />
              <Field label="SSIC HT S/N" value={val(emp.ssic_ht_sn)} />
              <Field label="SSIC HT Expiry" value={<ExpiryVal date={emp.ssic_ht_exp} />} />
              <Field label="Dynamac Pass S/N" value={val(emp.dynamac_pass_sn)} />
              <Field label="Dynamac Expiry" value={<ExpiryVal date={emp.dynamac_pass_exp} />} />
              <Field label="LSSC S/N" value={val(emp.lssc_sn)} />
              <Field label="Welder registration No" value={val(emp.welder_no)} />
            </div>
            
            <div className="certs-right-block">
              <div className="skill-deck-title">Accreditations & Approvals</div>
              <div className="skill-chips-deck">
                {certsList.map((skill, idx) => (
                  <span key={idx} className={`skill-pill-chip ${skill.value ? "active" : "inactive"}`}>
                    <span className="skill-dot" />
                    {skill.value ? "✓ " : ""} {skill.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Payroll */}
        <Section title="Payroll" icon="wallet" wide>
          <div className="payroll-summary-layout">
            <div className="payroll-fields-grid">
              <Field label="Current Salary" value={val(emp.salary)} />
              <Field label="Hourly Rate" value={val(emp.per_hr)} />
              <Field label="Last Payroll" value={payrolls.length > 0 ? `$${parseFloat(payrolls[payrolls.length - 1].total_salary)} (${payrolls[payrolls.length - 1].month.substring(0, 7)})` : "—"} />
              <Field label="Bank Account" value={val(emp.bank_account)} />
              
              <div className="detail-field" style={{ gridColumn: "span 2", marginTop: "8px" }}>
                <div className="detail-field-label">Payroll Directory</div>
                <button className="btn-action-outline" style={{ alignSelf: "start", marginTop: "4px" }} onClick={() => navigate(`/payroll?employee_id=${emp.emp_id}`)}>
                  View Payroll Records
                </button>
              </div>
            </div>
            
            <div className="payroll-chart-container">
              <div className="chart-header-row">
                <span className="chart-heading">Salary Trend</span>
                <span className="chart-meta">Historical Graph</span>
              </div>
              <div className="chart-canvas-wrapper">
                {showChart ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="empty-state-card chart-placeholder">
                    <div className="empty-icon-wrap">
                      <Icon name="wallet" size={20} stroke="var(--grey-400)" />
                    </div>
                    <h5>Historical Graph Unavailable</h5>
                    <p>Requires at least 3 historical payroll records to map trends.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Recent Activity */}
        <Section title="Recent Activity" icon="bell" wide>
          {activitiesLoading ? (
            <div className="activity-loader-wrap">
              <div className="detail-spinner" />
              <p>Loading activities...</p>
            </div>
          ) : user?.role !== "admin" ? (
            <p className="no-records-msg">Activity logs are only viewable by administrator accounts.</p>
          ) : activities.length > 0 ? (
            <div className="activity-timeline-feed">
              {activities.map((act) => {
                const dayHeader = getTimelineGroup(act.timestamp);
                return (
                  <div key={act.id} className="timeline-day-group">
                    <div className="timeline-day-header">{dayHeader}</div>
                    <div className="timeline-item-detail">
                      <div className="timeline-icon-wrap-detail">
                        <Icon name="clock3" size={10} stroke="var(--theme-600)" />
                      </div>
                      <div className="timeline-content-detail">
                        <p className="timeline-text-detail">
                          <strong>{act.action.replace(/_/g, ' ')}</strong>
                        </p>
                        <span className="timeline-desc-detail">
                          By {act.user_display}
                        </span>
                        <span className="timeline-time-detail">
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state-card">
              <div className="empty-icon-wrap">
                <Icon name="clock3" size={24} stroke="var(--grey-400)" />
              </div>
              <h5>No recent activity available</h5>
              <p>Activity will appear when profile changes occur.</p>
            </div>
          )}
        </Section>

        {/* Remarks */}
        {emp.remarks && (
          <Section title="Remarks" icon="fileText" wide>
            <p className="remarks-text">{emp.remarks}</p>
          </Section>
        )}

      </div>
    </div>
  );
}

/* ── Helper Components ───────────────────────────────── */

function Section({ title, icon, children, wide }) {
  return (
    <div className={`detail-section ${wide ? "detail-section--wide" : ""}`}>
      <div className="section-title">
        <span className="section-icon">
          <Icon name={icon} size={15} stroke="var(--theme-600)" />
        </span>
        {title}
      </div>
      <div className="section-grid-layout">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{value}</div>
    </div>
  );
}

function ExpiryVal({ date }) {
  if (!date || date === "" || date === null)
    return <span className="empty-val">—</span>;

  const today = new Date();
  const expDate = new Date(date);
  const diffMs = expDate - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let cls = "";
  if (diffDays < 0) cls = "expiry-expired";
  else if (diffDays <= 30) cls = "expiry-soon";
  else cls = "expiry-ok";

  return (
    <span className={`expiry-val ${cls}`}>
      {date}
      {diffDays < 0 && <span className="expiry-tag">Expired</span>}
      {diffDays >= 0 && diffDays <= 30 && (
        <span className="expiry-tag">Soon</span>
      )}
    </span>
  );
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default EmployeeDetail;
