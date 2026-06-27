import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../axiosInstance";
import Toast from "../components/Toast.js";
import "./EmployeeProfile.css";

function EmployeeProfile() {
  const { empId } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState({});
  const [formData, setFormData] = useState({});
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const val = (v) => (v !== null && v !== undefined && v !== "" ? v : "—");

  // Get user info from localStorage
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
  }, []);

  // ── Fetch Employee Data ──────────────────────────────────
  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`employees/${empId}/`);
      setEmp(response.data);
      setFormData(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching employee:", err);
      setError("Employee not found");
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  // ── Handle Field Editing ────────────────────────────────
  const startEditing = (field) => {
    setEditing({ ...editing, [field]: true });
  };

  const cancelEditing = (field) => {
    setEditing({ ...editing, [field]: false });
    setFormData({ ...formData, [field]: emp[field] || "" });
  };

  const saveField = async (field) => {
    try {
      const updateData = { [field]: formData[field] };
      await api.put(`employees/${empId}/update/`, updateData);
      setEmp({ ...emp, [field]: formData[field] });
      setEditing({ ...editing, [field]: false });
      showToast(`${field.replace(/_/g, ' ')} updated successfully`);
    } catch (error) {
      console.error("Error updating field:", error);
      showToast(`Failed to update ${field.replace(/_/g, ' ')}`, "error");
    }
  };

  // ── Handle Employee Deletion ───────────────────────────
  const deleteEmployee = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteEmployee = async () => {
    try {
      await api.delete(`employees/${empId}/`);
      showToast("Employee deleted successfully");
      setTimeout(() => navigate("/employees"), 1500);
    } catch (error) {
      console.error("Error deleting employee:", error);
      showToast("Failed to delete employee. Please try again.", "error");
    }
  };

  if (loading)
    return (
      <div className="detail-loading">
        <div className="detail-spinner" />
        <p>Loading editor interface...</p>
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

  const certsList = [
    { label: "Work At Height", field: "work_at_height", value: formData.work_at_height },
    { label: "Confined Space", field: "confined_space", value: formData.confined_space },
    { label: "Signalman / Rigger", field: "signalman_rigger", value: formData.signalman_rigger },
    { label: "Firewatchman", field: "firewatchman", value: formData.firewatchman },
    { label: "Gas Meter Carrier", field: "gas_meter_carrier", value: formData.gas_meter_carrier }
  ];

  return (
    <div className="detail-page">
      {/* ── 1. STICKY TOP BAR ──────────────────────────────── */}
      <div className="detail-sticky-bar no-print">
        <button className="btn-back-pill" onClick={() => navigate(`/employees/${emp.emp_id}`)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          View Profile
        </button>
        
        <div className="detail-sticky-actions">
          <span className="profile-edit-badge">
            <span className="edit-pulse" />
            Editing Mode
          </span>
          {user?.role === "admin" && (
            <button className="btn-action-danger" onClick={deleteEmployee}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
              </svg>
              Delete Employee
            </button>
          )}
        </div>
      </div>

      {/* ── 2. EDITING PROFILE HEADER ──────────────────────── */}
      <div className="profile-header-card edit-mode">
        <div className="profile-header-main">
          <div className="employee-avatar-large edit-avatar">
            {emp.name?.charAt(0).toUpperCase()}
          </div>
          <div className="profile-identity">
            <div className="profile-name-row">
              <h1>Editing {emp.name}</h1>
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
          <p className="edit-instructions-tip">
            💡 Click on any field value to edit details inline. Changes are synchronized to the database upon saving.
          </p>
        </div>
      </div>

      {/* ── SECTIONS DETAILS GRID ────────────────────────────── */}
      <div className="detail-sections-container">
        
        {/* Basic Information */}
        <Section title="Basic Information" icon="👤">
          <EditField
            label="Employee ID"
            value={<span className="mono-val">{emp.emp_id}</span>}
            editable={false}
          />
          <EditField
            label="Phone Number"
            field="phone"
            value={val(formData.phone)}
            isEditing={editing.phone}
            onEdit={() => startEditing("phone")}
            onChange={(v) => setFormData({ ...formData, phone: v })}
            onSave={() => saveField("phone")}
            onCancel={() => cancelEditing("phone")}
          />
          <EditField
            label="Nationality"
            field="nationality"
            value={val(formData.nationality)}
            isEditing={editing.nationality}
            onEdit={() => startEditing("nationality")}
            onChange={(v) => setFormData({ ...formData, nationality: v })}
            onSave={() => saveField("nationality")}
            onCancel={() => cancelEditing("nationality")}
          />
          <EditField
            label="Date of Birth"
            field="dob"
            value={val(formData.dob)}
            isEditing={editing.dob}
            onEdit={() => startEditing("dob")}
            onChange={(v) => setFormData({ ...formData, dob: v })}
            onSave={() => saveField("dob")}
            onCancel={() => cancelEditing("dob")}
            type="date"
          />
        </Section>

        {/* Employment details */}
        <Section title="Employment details" icon="💼">
          <EditField
            label="Date of Joining"
            field="doa"
            value={val(formData.doa)}
            isEditing={editing.doa}
            onEdit={() => startEditing("doa")}
            onChange={(v) => setFormData({ ...formData, doa: v })}
            onSave={() => saveField("doa")}
            onCancel={() => cancelEditing("doa")}
            type="date"
          />
          <EditField
            label="Arrival Date"
            field="arrival_date"
            value={val(formData.arrival_date)}
            isEditing={editing.arrival_date}
            onEdit={() => startEditing("arrival_date")}
            onChange={(v) => setFormData({ ...formData, arrival_date: v })}
            onSave={() => saveField("arrival_date")}
            onCancel={() => cancelEditing("arrival_date")}
            type="date"
          />
          <EditField
            label="Accommodation"
            field="accommodation"
            value={val(formData.accommodation)}
            isEditing={editing.accommodation}
            onEdit={() => startEditing("accommodation")}
            onChange={(v) => setFormData({ ...formData, accommodation: v })}
            onSave={() => saveField("accommodation")}
            onCancel={() => cancelEditing("accommodation")}
          />
          <EditField
            label="PCP Status"
            field="pcp_status"
            value={val(formData.pcp_status)}
            isEditing={editing.pcp_status}
            onEdit={() => startEditing("pcp_status")}
            onChange={(v) => setFormData({ ...formData, pcp_status: v })}
            onSave={() => saveField("pcp_status")}
            onCancel={() => cancelEditing("pcp_status")}
          />
          <EditField
            label="Division"
            value={val(emp.division)}
            editable={false}
          />
          <EditField
            label="Work Status"
            value={<span className={`status-badge-pill ${isActive ? "active" : "inactive"}`}>{emp.status}</span>}
            editable={false}
          />
        </Section>

        {/* Work Permit */}
        <Section title="Work Permit" icon="📋">
          <EditField
            label="Work Permit No"
            field="work_permit_no"
            value={val(formData.work_permit_no)}
            isEditing={editing.work_permit_no}
            onEdit={() => startEditing("work_permit_no")}
            onChange={(v) => setFormData({ ...formData, work_permit_no: v })}
            onSave={() => saveField("work_permit_no")}
            onCancel={() => cancelEditing("work_permit_no")}
          />
          <EditField
            label="FIN No"
            field="fin_no"
            value={val(formData.fin_no)}
            isEditing={editing.fin_no}
            onEdit={() => startEditing("fin_no")}
            onChange={(v) => setFormData({ ...formData, fin_no: v })}
            onSave={() => saveField("fin_no")}
            onCancel={() => cancelEditing("fin_no")}
          />
          <EditField
            label="Issue Date"
            field="issue_date"
            value={val(formData.issue_date)}
            isEditing={editing.issue_date}
            onEdit={() => startEditing("issue_date")}
            onChange={(v) => setFormData({ ...formData, issue_date: v })}
            onSave={() => saveField("issue_date")}
            onCancel={() => cancelEditing("issue_date")}
            type="date"
          />
          <EditField
            label="WP Expiry"
            field="wp_expiry"
            value={<ExpiryVal date={formData.wp_expiry} />}
            isEditing={editing.wp_expiry}
            onEdit={() => startEditing("wp_expiry")}
            onChange={(v) => setFormData({ ...formData, wp_expiry: v })}
            onSave={() => saveField("wp_expiry")}
            onCancel={() => cancelEditing("wp_expiry")}
            type="date"
          />
          <EditField
            label="IC Status"
            field="ic_status"
            value={val(formData.ic_status)}
            isEditing={editing.ic_status}
            onEdit={() => startEditing("ic_status")}
            onChange={(v) => setFormData({ ...formData, ic_status: v })}
            onSave={() => saveField("ic_status")}
            onCancel={() => cancelEditing("ic_status")}
          />
        </Section>

        {/* Passport */}
        <Section title="Passport" icon="🛂">
          <EditField
            label="Passport No"
            field="passport_no"
            value={val(formData.passport_no)}
            isEditing={editing.passport_no}
            onEdit={() => startEditing("passport_no")}
            onChange={(v) => setFormData({ ...formData, passport_no: v })}
            onSave={() => saveField("passport_no")}
            onCancel={() => cancelEditing("passport_no")}
          />
          <EditField
            label="Passport Expiry"
            field="passport_expiry"
            value={<ExpiryVal date={formData.passport_expiry} />}
            isEditing={editing.passport_expiry}
            onEdit={() => startEditing("passport_expiry")}
            onChange={(v) => setFormData({ ...formData, passport_expiry: v })}
            onSave={() => saveField("passport_expiry")}
            onCancel={() => cancelEditing("passport_expiry")}
            type="date"
          />
          <EditField
            label="Issue Date"
            field="passport_issue_date"
            value={val(formData.passport_issue_date)}
            isEditing={editing.passport_issue_date}
            onEdit={() => startEditing("passport_issue_date")}
            onChange={(v) => setFormData({ ...formData, passport_issue_date: v })}
            onSave={() => saveField("passport_issue_date")}
            onCancel={() => cancelEditing("passport_issue_date")}
            type="date"
          />
          <EditField
            label="Issue Place"
            field="passport_issue_place"
            value={val(formData.passport_issue_place)}
            isEditing={editing.passport_issue_place}
            onEdit={() => startEditing("passport_issue_place")}
            onChange={(v) => setFormData({ ...formData, passport_issue_place: v })}
            onSave={() => saveField("passport_issue_place")}
            onCancel={() => cancelEditing("passport_issue_place")}
          />
        </Section>

        {/* Security Bond */}
        <Section title="Security Bond" icon="🔐">
          <EditField
            label="Bond No"
            field="security_bond_no"
            value={val(formData.security_bond_no)}
            isEditing={editing.security_bond_no}
            onEdit={() => startEditing("security_bond_no")}
            onChange={(v) => setFormData({ ...formData, security_bond_no: v })}
            onSave={() => saveField("security_bond_no")}
            onCancel={() => cancelEditing("security_bond_no")}
          />
          <EditField
            label="Bond Expiry"
            field="security_bond_exp"
            value={<ExpiryVal date={formData.security_bond_exp} />}
            isEditing={editing.security_bond_exp}
            onEdit={() => startEditing("security_bond_exp")}
            onChange={(v) => setFormData({ ...formData, security_bond_exp: v })}
            onSave={() => saveField("security_bond_exp")}
            onCancel={() => cancelEditing("security_bond_exp")}
            type="date"
          />
        </Section>

        {/* Certifications */}
        <Section title="Certifications & Skills" icon="🏅" wide>
          <div className="certs-display-grid">
            <div className="certs-left-block">
              <EditField
                label="SSIC GT S/N"
                field="ssic_gt_sn"
                value={val(formData.ssic_gt_sn)}
                isEditing={editing.ssic_gt_sn}
                onEdit={() => startEditing("ssic_gt_sn")}
                onChange={(v) => setFormData({ ...formData, ssic_gt_sn: v })}
                onSave={() => saveField("ssic_gt_sn")}
                onCancel={() => cancelEditing("ssic_gt_sn")}
              />
              <EditField
                label="SSIC GT Expiry"
                field="ssic_gt_exp"
                value={<ExpiryVal date={formData.ssic_gt_exp} />}
                isEditing={editing.ssic_gt_exp}
                onEdit={() => startEditing("ssic_gt_exp")}
                onChange={(v) => setFormData({ ...formData, ssic_gt_exp: v })}
                onSave={() => saveField("ssic_gt_exp")}
                onCancel={() => cancelEditing("ssic_gt_exp")}
                type="date"
              />
              <EditField
                label="SSIC HT S/N"
                field="ssic_ht_sn"
                value={val(formData.ssic_ht_sn)}
                isEditing={editing.ssic_ht_sn}
                onEdit={() => startEditing("ssic_ht_sn")}
                onChange={(v) => setFormData({ ...formData, ssic_ht_sn: v })}
                onSave={() => saveField("ssic_ht_sn")}
                onCancel={() => cancelEditing("ssic_ht_sn")}
              />
              <EditField
                label="SSIC HT Expiry"
                field="ssic_ht_exp"
                value={<ExpiryVal date={formData.ssic_ht_exp} />}
                isEditing={editing.ssic_ht_exp}
                onEdit={() => startEditing("ssic_ht_exp")}
                onChange={(v) => setFormData({ ...formData, ssic_ht_exp: v })}
                onSave={() => saveField("ssic_ht_exp")}
                onCancel={() => cancelEditing("ssic_ht_exp")}
                type="date"
              />
              <EditField
                label="Dynamac Pass S/N"
                field="dynamac_pass_sn"
                value={val(formData.dynamac_pass_sn)}
                isEditing={editing.dynamac_pass_sn}
                onEdit={() => startEditing("dynamac_pass_sn")}
                onChange={(v) => setFormData({ ...formData, dynamac_pass_sn: v })}
                onSave={() => saveField("dynamac_pass_sn")}
                onCancel={() => cancelEditing("dynamac_pass_sn")}
              />
              <EditField
                label="Dynamac Expiry"
                field="dynamac_pass_exp"
                value={<ExpiryVal date={formData.dynamac_pass_exp} />}
                isEditing={editing.dynamac_pass_exp}
                onEdit={() => startEditing("dynamac_pass_exp")}
                onChange={(v) => setFormData({ ...formData, dynamac_pass_exp: v })}
                onSave={() => saveField("dynamac_pass_exp")}
                onCancel={() => cancelEditing("dynamac_pass_exp")}
                type="date"
              />
              <EditField
                label="LSSC S/N"
                field="lssc_sn"
                value={val(formData.lssc_sn)}
                isEditing={editing.lssc_sn}
                onEdit={() => startEditing("lssc_sn")}
                onChange={(v) => setFormData({ ...formData, lssc_sn: v })}
                onSave={() => saveField("lssc_sn")}
                onCancel={() => cancelEditing("lssc_sn")}
              />
              <EditField
                label="Welder registration No"
                field="welder_no"
                value={val(formData.welder_no)}
                isEditing={editing.welder_no}
                onEdit={() => startEditing("welder_no")}
                onChange={(v) => setFormData({ ...formData, welder_no: v })}
                onSave={() => saveField("welder_no")}
                onCancel={() => cancelEditing("welder_no")}
              />
            </div>
            
            <div className="certs-right-block">
              <div className="skill-deck-title">Inline Skills Settings</div>
              <div className="skill-chips-deck edit-mode">
                {certsList.map((skill, idx) => (
                  <div key={idx} className="skill-pill-chip-edit-wrap">
                    <EditField
                      label={skill.label}
                      field={skill.field}
                      value={skill.value}
                      isEditing={editing[skill.field]}
                      onEdit={() => startEditing(skill.field)}
                      onChange={(v) => setFormData({ ...formData, [skill.field]: v })}
                      onSave={() => saveField(skill.field)}
                      onCancel={() => cancelEditing(skill.field)}
                      type="boolean"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Payroll Summary */}
        <Section title="Payroll Summary" icon="💳" wide>
          <div className="payroll-fields-grid">
            <EditField
              label="IPA Salary"
              field="ipa_salary"
              value={val(formData.ipa_salary)}
              isEditing={editing.ipa_salary}
              onEdit={() => startEditing("ipa_salary")}
              onChange={(v) => setFormData({ ...formData, ipa_salary: v })}
              onSave={() => saveField("ipa_salary")}
              onCancel={() => cancelEditing("ipa_salary")}
              type="number"
            />
            <EditField
              label="Per Hour rate"
              field="per_hr"
              value={val(formData.per_hr)}
              isEditing={editing.per_hr}
              onEdit={() => startEditing("per_hr")}
              onChange={(v) => setFormData({ ...formData, per_hr: v })}
              onSave={() => saveField("per_hr")}
              onCancel={() => cancelEditing("per_hr")}
              type="number"
            />
            <EditField
              label="Latest Salary"
              field="salary"
              value={val(formData.salary)}
              isEditing={editing.salary}
              onEdit={() => startEditing("salary")}
              onChange={(v) => setFormData({ ...formData, salary: v })}
              onSave={() => saveField("salary")}
              onCancel={() => cancelEditing("salary")}
              type="number"
            />
            <EditField
              label="Bank Account No"
              field="bank_account"
              value={val(formData.bank_account)}
              isEditing={editing.bank_account}
              onEdit={() => startEditing("bank_account")}
              onChange={(v) => setFormData({ ...formData, bank_account: v })}
              onSave={() => saveField("bank_account")}
              onCancel={() => cancelEditing("bank_account")}
            />
          </div>
        </Section>

        {/* Qualification */}
        <Section title="Qualification" icon="🎓">
          <EditField
            label="Qualification"
            field="qualification"
            value={val(formData.qualification)}
            isEditing={editing.qualification}
            onEdit={() => startEditing("qualification")}
            onChange={(v) => setFormData({ ...formData, qualification: v })}
            onSave={() => saveField("qualification")}
            onCancel={() => cancelEditing("qualification")}
          />
        </Section>

        {/* Remarks */}
        {formData.remarks !== undefined && (
          <Section title="Remarks" icon="📝" wide>
            <div className="remarks-section">
              {editing.remarks ? (
                <div className="edit-textarea">
                  <textarea
                    value={formData.remarks || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    className="detail-textarea"
                    placeholder="Enter remarks..."
                  />
                  <div className="edit-actions">
                    <button
                      className="save-btn"
                      onClick={() => saveField("remarks")}
                    >
                      ✓ Save Remarks
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => cancelEditing("remarks")}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="remarks-view">
                  <p className="remarks-text">{formData.remarks || "No remarks entered."}</p>
                  <button
                    className="edit-btn-inline"
                    onClick={() => startEditing("remarks")}
                  >
                    ✏️ Edit Remarks
                  </button>
                </div>
              )}
            </div>
          </Section>
        )}

      </div>

      {showDeleteModal && (
        <div className="custom-confirm-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="custom-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon">⚠️</div>
            <h3>Delete Employee</h3>
            <p>
              Are you sure you want to delete employee <strong>{emp?.name} ({emp?.emp_id})</strong>?
              This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn cancel" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="confirm-btn confirm" onClick={() => {
                setShowDeleteModal(false);
                confirmDeleteEmployee();
              }}>
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
      <div className="section-grid-layout">{children}</div>
    </div>
  );
}

function EditField({
  label,
  value,
  field,
  isEditing,
  onEdit,
  onChange,
  onSave,
  onCancel,
  type = "text",
  editable = true,
}) {
  if (!editable) {
    return (
      <div className="detail-field">
        <div className="detail-field-label">{label}</div>
        <div className="detail-field-value">{value}</div>
      </div>
    );
  }

  const isBool = type === "boolean";

  return (
    <div className={`detail-field ${field ? "editable" : ""}`}>
      <div className="detail-field-label">{label}</div>
      {isEditing ? (
        <div className="field-edit-mode">
          {isBool ? (
            <select
              value={value ? "true" : "false"}
              onChange={(e) => onChange(e.target.value === "true")}
              className="detail-select-input"
              autoFocus
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="detail-input"
              autoFocus
            />
          )}
          <div className="edit-actions-stacked">
            <button className="save-btn-full" onClick={onSave} title="Save Changes">
              ✓ Save
            </button>
            <button
              className="cancel-btn-full"
              onClick={onCancel}
              title="Cancel Changes"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`detail-field-value ${field ? "editable-field" : ""}`}
          onClick={() => field && onEdit && onEdit()}
        >
          {isBool ? (
            <span className={`skill-pill-chip ${value ? "active" : "inactive"}`}>
              <span className="skill-dot" />
              {value ? "Yes" : "No"}
            </span>
          ) : (
            value
          )}
        </div>
      )}
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

export default EmployeeProfile;
