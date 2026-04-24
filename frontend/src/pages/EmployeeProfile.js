import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../axiosInstance";
import "./EmployeeProfile.css";

function EmployeeProfile() {
  const { empId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});
  const [formData, setFormData] = useState({});
  const [adminEditMode, setAdminEditMode] = useState(false);

  // ── Fetch Employee Data ──────────────────────────────────
  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`employee/${empId}/`);
      setEmployee(response.data);
      setFormData({
        name: response.data.name || "",
        phone: response.data.phone || "",
        salary: response.data.ipa_salary || "",
        designation_ipa: response.data.designation_ipa || "",
        nationality: response.data.nationality || "",
        dob: response.data.dob || "",
        work_permit_no: response.data.work_permit_no || "",
        fin_no: response.data.fin_no || "",
        passport_no: response.data.passport_no || "",
        qualification: response.data.qualification || "",
        accommodation: response.data.accommodation || "",
        remarks: response.data.remarks || "",
      });
    } catch (error) {
      console.error("Error fetching employee:", error);
      alert("Failed to load employee data");
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
    // Reset form data for this field
    if (employee) {
      setFormData({
        ...formData,
        [field]: employee[field] || "",
      });
    }
  };

  const saveField = async (field) => {
    try {
      const updateData = { [field]: formData[field] };
      await api.put(`employee/update/${empId}/`, updateData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Update local state
      setEmployee({ ...employee, [field]: formData[field] });
      setEditing({ ...editing, [field]: false });

      alert(
        `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`,
      );
    } catch (error) {
      console.error("Error updating field:", error);
      alert(`Failed to update ${field}`);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="employee-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading employee profile...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="employee-profile-error">
        <h2>Employee Not Found</h2>
        <p>The requested employee could not be found.</p>
        <button onClick={() => navigate("/employees")} className="back-btn">
          ← Back to Employee List
        </button>
      </div>
    );
  }

  const initials = (employee.name || "E")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="employee-profile-page">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="profile-header">
        <button onClick={() => navigate("/employees")} className="back-btn">
          ← Back to Employee List
        </button>
        <div className="header-right">
          <h1>Employee Profile</h1>
          <div className="admin-edit-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={adminEditMode}
                onChange={(e) => {
                  console.log("Toggle changed:", e.target.checked);
                  setAdminEditMode(e.target.checked);
                }}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">Admin Edit Mode</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Profile Card ──────────────────────────────────── */}
      <div className="profile-card">
        {/* Avatar Section */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-large">{initials}</div>
          <div className="profile-basic-info">
            <h2>{employee.name}</h2>
            <p className="emp-id">EMP ID: {employee.emp_id}</p>
            <p className="division">{employee.division}</p>
            <span className={`status-badge ${employee.status?.toLowerCase()}`}>
              {employee.status}
            </span>
          </div>
        </div>

        {/* Details Sections */}
        <div className="profile-details">
          {/* Basic Information */}
          <div className="detail-section">
            <h3>Basic Information</h3>
            <div className="fields-grid">
              <EditableField
                label="Name"
                field="name"
                value={formData.name}
                isEditing={editing.name}
                onStartEdit={() => startEditing("name")}
                onCancel={() => cancelEditing("name")}
                onSave={() => saveField("name")}
                onChange={(value) => handleInputChange("name", value)}
                adminEditMode={adminEditMode}
              />

              <EditableField
                label="Phone"
                field="phone"
                value={formData.phone}
                isEditing={editing.phone}
                onStartEdit={() => startEditing("phone")}
                onCancel={() => cancelEditing("phone")}
                onSave={() => saveField("phone")}
                onChange={(value) => handleInputChange("phone", value)}
                adminEditMode={adminEditMode}
              />

              <EditableField
                label="Salary"
                field="salary"
                value={formData.salary}
                isEditing={editing.salary}
                onStartEdit={() => startEditing("salary")}
                onCancel={() => cancelEditing("salary")}
                onSave={() => saveField("salary")}
                onChange={(value) => handleInputChange("salary", value)}
                type="number"
                adminEditMode={adminEditMode}
              />

              <EditableField
                label="Designation"
                field="designation_ipa"
                value={formData.designation_ipa}
                isEditing={editing.designation_ipa}
                onStartEdit={() => startEditing("designation_ipa")}
                onCancel={() => cancelEditing("designation_ipa")}
                onSave={() => saveField("designation_ipa")}
                onChange={(value) =>
                  handleInputChange("designation_ipa", value)
                }
                adminEditMode={adminEditMode}
              />

              <EditableField
                label="Nationality"
                field="nationality"
                value={formData.nationality}
                isEditing={editing.nationality}
                onStartEdit={() => startEditing("nationality")}
                onCancel={() => cancelEditing("nationality")}
                onSave={() => saveField("nationality")}
                onChange={(value) => handleInputChange("nationality", value)}
                adminEditMode={adminEditMode}
              />

              <EditableField
                label="Date of Birth"
                field="dob"
                value={formData.dob}
                isEditing={editing.dob}
                onStartEdit={() => startEditing("dob")}
                onCancel={() => cancelEditing("dob")}
                onSave={() => saveField("dob")}
                onChange={(value) => handleInputChange("dob", value)}
                type="date"
                adminEditMode={adminEditMode}
              />
            </div>
          </div>

          {/* Work Permit & Documents */}
          <div className="detail-section">
            <h3>Work Permit & Documents</h3>
            <div className="fields-grid">
              <EditableField
                label="Work Permit No"
                field="work_permit_no"
                value={formData.work_permit_no}
                isEditing={editing.work_permit_no}
                onStartEdit={() => startEditing("work_permit_no")}
                onCancel={() => cancelEditing("work_permit_no")}
                onSave={() => saveField("work_permit_no")}
                onChange={(value) => handleInputChange("work_permit_no", value)}
                adminEditMode={adminEditMode}
              />

              <EditableField
                label="FIN No"
                field="fin_no"
                value={formData.fin_no}
                isEditing={editing.fin_no}
                onStartEdit={() => startEditing("fin_no")}
                onCancel={() => cancelEditing("fin_no")}
                onSave={() => saveField("fin_no")}
                onChange={(value) => handleInputChange("fin_no", value)}
                adminEditMode={adminEditMode}
              />

              <EditableField
                label="Passport No"
                field="passport_no"
                value={formData.passport_no}
                isEditing={editing.passport_no}
                onStartEdit={() => startEditing("passport_no")}
                onCancel={() => cancelEditing("passport_no")}
                onSave={() => saveField("passport_no")}
                onChange={(value) => handleInputChange("passport_no", value)}
                adminEditMode={adminEditMode}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="detail-section">
            <h3>Additional Information</h3>
            <div className="fields-grid">
              <EditableField
                label="Qualification"
                field="qualification"
                value={formData.qualification}
                isEditing={editing.qualification}
                onStartEdit={() => startEditing("qualification")}
                onCancel={() => cancelEditing("qualification")}
                onSave={() => saveField("qualification")}
                onChange={(value) => handleInputChange("qualification", value)}
                adminEditMode={adminEditMode}
              />

              <EditableField
                label="Accommodation"
                field="accommodation"
                value={formData.accommodation}
                isEditing={editing.accommodation}
                onStartEdit={() => startEditing("accommodation")}
                onCancel={() => cancelEditing("accommodation")}
                onSave={() => saveField("accommodation")}
                onChange={(value) => handleInputChange("accommodation", value)}
                adminEditMode={adminEditMode}
              />

              <EditableField
                label="Remarks"
                field="remarks"
                value={formData.remarks}
                isEditing={editing.remarks}
                onStartEdit={() => startEditing("remarks")}
                onCancel={() => cancelEditing("remarks")}
                onSave={() => saveField("remarks")}
                onChange={(value) => handleInputChange("remarks", value)}
                isTextarea={true}
                adminEditMode={adminEditMode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Editable Field Component ─────────────────────────────
function EditableField({
  label,
  field,
  value,
  isEditing,
  onStartEdit,
  onCancel,
  onSave,
  onChange,
  type = "text",
  isTextarea = false,
  adminEditMode = false,
}) {
  return (
    <div className="editable-field">
      <label className="field-label">{label}</label>
      <div className="field-content">
        {isEditing ? (
          <div className="edit-mode">
            {isTextarea ? (
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="field-input textarea"
                rows="3"
              />
            ) : (
              <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="field-input"
              />
            )}
            <div className="edit-actions">
              <button onClick={onSave} className="save-btn">
                Save
              </button>
              <button onClick={onCancel} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`view-mode ${adminEditMode ? "editable" : ""}`}
            onClick={() => adminEditMode && onStartEdit()}
          >
            <span className="field-value">{value || "—"}</span>
            {adminEditMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                className="edit-btn-small"
              >
                ✏️ Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeProfile;
