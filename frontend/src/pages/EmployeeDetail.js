import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./EmployeeDetail.css";

function EmployeeDetail() {
  const { empId } = useParams();
  const navigate  = useNavigate();
  const [emp, setEmp]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`http://127.0.0.1:8000/api/employee/${empId}/`)
      .then(res => { setEmp(res.data); setLoading(false); })
      .catch(() => { setError("Employee not found"); setLoading(false); });
  }, [empId]);

  const val = (v) => (v !== null && v !== undefined && v !== "" ? v : "—");

  if (loading) return (
    <div className="detail-loading">
      <div className="detail-spinner" />
      <p>Loading employee…</p>
    </div>
  );

  if (error) return (
    <div className="detail-loading">
      <p className="detail-error">{error}</p>
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );

  const isActive = emp.status?.toLowerCase() === "active";

  return (
    <div className="detail-page">

      {/* ── TOP BAR ───────────────────────────────────── */}
      <div className="detail-topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to List
        </button>
      </div>

      {/* ── HERO CARD ─────────────────────────────────── */}
      <div className="detail-hero">
        <div className="detail-avatar">
          {emp.name?.charAt(0).toUpperCase()}
        </div>
        <div className="detail-hero-info">
          <h1>{emp.name}</h1>
          <p className="detail-hero-sub">
            {emp.designation_ipa || emp.designation_aug || "Employee"}
            <span className="hero-dot">·</span>
            {emp.division}
          </p>
          <div className="detail-hero-badges">
            <span className="emp-id-badge">{emp.emp_id}</span>
            <span className={`status-pill ${isActive ? "active" : "inactive"}`}>
              {emp.status}
            </span>
            {emp.nationality && (
              <span className="nationality-badge">{emp.nationality}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTIONS GRID ─────────────────────────────── */}
      <div className="detail-sections">

        {/* Basic Info */}
        <Section title="Basic Info" icon="👤">
          <Field label="EMP ID"       value={<span className="mono-val">{emp.emp_id}</span>} />
          <Field label="Phone"        value={val(emp.phone)} />
          <Field label="Nationality"  value={val(emp.nationality)} />
          <Field label="Date of Birth" value={val(emp.dob)} />
          <Field label="Division"     value={val(emp.division)} />
          <Field label="Status"       value={
            <span className={`status-pill ${isActive ? "active" : "inactive"}`}>
              {emp.status}
            </span>
          } />
        </Section>

        {/* Designation & Salary */}
        <Section title="Designation & Salary" icon="💼">
          <Field label="IPA Designation" value={val(emp.designation_ipa)} />
          <Field label="Aug Designation" value={val(emp.designation_aug)} />
          <Field label="IPA Salary"      value={val(emp.ipa_salary)} />
          <Field label="Per Hour"        value={val(emp.per_hr)} />
          <Field label="Salary"          value={val(emp.salary)} />
          <Field label="Bank Account"    value={val(emp.bank_account)} />
        </Section>

        {/* Work Permit */}
        <Section title="Work Permit" icon="📋">
          <Field label="Work Permit No" value={val(emp.work_permit_no)} />
          <Field label="FIN No"         value={val(emp.fin_no)} />
          <Field label="Issue Date"     value={val(emp.issue_date)} />
          <Field label="WP Expiry"      value={<ExpiryVal date={emp.wp_expiry} />} />
          <Field label="IC Status"      value={val(emp.ic_status)} />
        </Section>

        {/* Passport */}
        <Section title="Passport" icon="🛂">
          <Field label="Passport No"    value={val(emp.passport_no)} />
          <Field label="Expiry"         value={<ExpiryVal date={emp.passport_expiry} />} />
          <Field label="Issue Date"     value={val(emp.passport_issue_date)} />
          <Field label="Issue Place"    value={val(emp.passport_issue_place)} />
        </Section>

        {/* Joining */}
        <Section title="Joining Details" icon="📅">
          <Field label="Date of Joining"  value={val(emp.doa)} />
          <Field label="Arrival Date"     value={val(emp.arrival_date)} />
          <Field label="Accommodation"    value={val(emp.accommodation)} />
          <Field label="PCP Status"       value={val(emp.pcp_status)} />
        </Section>

        {/* Security Bond */}
        <Section title="Security Bond" icon="🔐">
          <Field label="Bond No"     value={val(emp.security_bond_no)} />
          <Field label="Bond Expiry" value={<ExpiryVal date={emp.security_bond_exp} />} />
        </Section>

        {/* Certifications */}
        <Section title="Certifications & Skills" icon="🏅" wide>
          <Field label="SSIC GT S/N"      value={val(emp.ssic_gt_sn)} />
          <Field label="SSIC GT Expiry"   value={<ExpiryVal date={emp.ssic_gt_exp} />} />
          <Field label="SSIC HT S/N"      value={val(emp.ssic_ht_sn)} />
          <Field label="SSIC HT Expiry"   value={<ExpiryVal date={emp.ssic_ht_exp} />} />
          <Field label="Dynamac Pass S/N" value={val(emp.dynamac_pass_sn)} />
          <Field label="Dynamac Expiry"   value={<ExpiryVal date={emp.dynamac_pass_exp} />} />
          <Field label="LSSC S/N"         value={val(emp.lssc_sn)} />
          <Field label="Welder No"        value={val(emp.welder_no)} />
          <Field label="Work At Height"   value={<BoolBadge v={emp.work_at_height} />} />
          <Field label="Confined Space"   value={<BoolBadge v={emp.confined_space} />} />
          <Field label="Signalman/Rigger" value={<BoolBadge v={emp.signalman_rigger} />} />
          <Field label="Firewatchman"     value={<BoolBadge v={emp.firewatchman} />} />
          <Field label="Gas Meter Carrier" value={<BoolBadge v={emp.gas_meter_carrier} />} />
        </Section>

        {/* Qualification */}
        <Section title="Qualification" icon="🎓">
          <Field label="Qualification" value={val(emp.qualification)} />
        </Section>

        {/* Remarks */}
        {emp.remarks && (
          <Section title="Remarks" icon="📝" wide>
            <div className="remarks-text">{emp.remarks}</div>
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
        <span className="section-icon">{icon}</span>
        {title}
      </div>
      <div className="section-grid">
        {children}
      </div>
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
  if (!date || date === "" || date === null) return <span className="empty-val">—</span>;

  const today   = new Date();
  const expDate = new Date(date);
  const diffMs  = expDate - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let cls = "";
  if (diffDays < 0)       cls = "expiry-expired";
  else if (diffDays <= 30) cls = "expiry-soon";
  else                     cls = "expiry-ok";

  return (
    <span className={`expiry-val ${cls}`}>
      {date}
      {diffDays < 0 && <span className="expiry-tag">Expired</span>}
      {diffDays >= 0 && diffDays <= 30 && <span className="expiry-tag">Soon</span>}
    </span>
  );
}

function BoolBadge({ v }) {
  return v
    ? <span className="bool-badge bool-yes">Yes</span>
    : <span className="bool-badge bool-no">No</span>;
}

export default EmployeeDetail;