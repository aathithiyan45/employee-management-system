import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../axiosInstance";
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
    } catch (error) {
      console.error("Error updating field:", error);
      alert(`Failed to update ${field}`);
    }
  };

  // ── Handle Employee Deletion ───────────────────────────
  const deleteEmployee = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete employee ${emp?.name} (${emp?.emp_id})? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`employees/${empId}/`);
      alert("Employee deleted successfully");
      navigate("/employees");
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Failed to delete employee. Please try again.");
    }
  };

  if (loading)
    return (
      <div className="detail-loading">
        <div className="detail-spinner" />
        <p>Loading employee…</p>
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

  return (
    <div className="detail-page">
      {/* ── TOP BAR ───────────────────────────────────── */}
      <div className="detail-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to List
          </button>
        </div>
        {user?.role === "admin" && (
          <div className="topbar-right">
            <button className="delete-btn" onClick={deleteEmployee}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
              </svg>
              Delete Employee
            </button>
          </div>
        )}
      </div>

      {/* ── HERO CARD ─────────────────────────────────── */}
      <div className="detail-hero">
        <div className="detail-avatar">{emp.name?.charAt(0).toUpperCase()}</div>
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
          <EditField
            label="EMP ID"
            value={<span className="mono-val">{emp.emp_id}</span>}
            editable={false}
          />
          <EditField
            label="Phone"
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
          <EditField
            label="Division"
            value={val(emp.division)}
            editable={false}
          />
          <EditField
            label="Status"
            value={
              <span
                className={`status-pill ${isActive ? "active" : "inactive"}`}
              >
                {emp.status}
              </span>
            }
            editable={false}
          />
        </Section>

        {/* Designation & Salary */}
        <Section title="Designation & Salary" icon="💼">
          <EditField
            label="IPA Designation"
            field="designation_ipa"
            value={val(formData.designation_ipa)}
            isEditing={editing.designation_ipa}
            onEdit={() => startEditing("designation_ipa")}
            onChange={(v) => setFormData({ ...formData, designation_ipa: v })}
            onSave={() => saveField("designation_ipa")}
            onCancel={() => cancelEditing("designation_ipa")}
          />
          <EditField
            label="Aug Designation"
            field="designation_aug"
            value={val(formData.designation_aug)}
            isEditing={editing.designation_aug}
            onEdit={() => startEditing("designation_aug")}
            onChange={(v) => setFormData({ ...formData, designation_aug: v })}
            onSave={() => saveField("designation_aug")}
            onCancel={() => cancelEditing("designation_aug")}
          />
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
            label="Per Hour"
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
            label="Bank Account"
            field="bank_account"
            value={val(formData.bank_account)}
            isEditing={editing.bank_account}
            onEdit={() => startEditing("bank_account")}
            onChange={(v) => setFormData({ ...formData, bank_account: v })}
            onSave={() => saveField("bank_account")}
            onCancel={() => cancelEditing("bank_account")}
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
            label="Expiry"
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
            onChange={(v) =>
              setFormData({ ...formData, passport_issue_date: v })
            }
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
            onChange={(v) =>
              setFormData({ ...formData, passport_issue_place: v })
            }
            onSave={() => saveField("passport_issue_place")}
            onCancel={() => cancelEditing("passport_issue_place")}
          />
        </Section>

        {/* Joining */}
        <Section title="Joining Details" icon="📅">
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
        {formData.remarks && (
          <Section title="Remarks" icon="📝" wide>
            <div className="remarks-section">
              {editing.remarks ? (
                <div className="edit-textarea">
                  <textarea
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    className="detail-textarea"
                  />
                  <div className="edit-actions">
                    <button
                      className="save-btn"
                      onClick={() => saveField("remarks")}
                    >
                      Save
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => cancelEditing("remarks")}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="remarks-view">
                  <p className="remarks-text">{formData.remarks}</p>
                  <button
                    className="edit-btn-inline"
                    onClick={() => startEditing("remarks")}
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </div>
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
      <div className="section-grid">{children}</div>
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

  return (
    <div className={`detail-field ${field ? "editable" : ""}`}>
      <div className="detail-field-label">{label}</div>
      {isEditing ? (
        <div className="field-edit-mode">
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="detail-input"
            autoFocus
          />
          <div className="edit-actions-stacked">
            <button className="save-btn-full" onClick={onSave} title="Save">
              ✓ Save
            </button>
            <button
              className="cancel-btn-full"
              onClick={onCancel}
              title="Cancel"
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
          {value}
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
