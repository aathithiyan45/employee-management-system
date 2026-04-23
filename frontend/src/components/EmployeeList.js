import { useEffect, useState } from "react";
import axios from "axios";
import "./EmployeeList.css";

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [division, setDivision] = useState("");
  const [divisions, setDivisions] = useState([]);
  const [status, setStatus] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // ── Fetch Divisions ──────────────────────────────────────
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/divisions/")
      .then(res => {
        setDivisions(res.data);
        if (res.data.length > 0) setDivision(res.data[0].name);
      })
      .catch(err => console.log(err));
  }, []);

  // ── Fetch Employees ──────────────────────────────────────
  useEffect(() => {
    if (!division) return;
    axios.get(`http://127.0.0.1:8000/api/employees/?division=${division}&status=${status}`)
      .then(res => setEmployees(res.data))
      .catch(err => console.log(err));
  }, [division, status]);

  // ── Fetch Single Employee ────────────────────────────────
  const fetchEmployee = (id) => {
    axios.get(`http://127.0.0.1:8000/api/employee/${id}/`)
      .then(res => setSelectedEmployee(res.data))
      .catch(err => console.log(err));
  };

  // ── helpers ──────────────────────────────────────────────
  const val = (v) =>
    v !== null && v !== undefined && v !== ""
      ? v
      : <span className="modal-field-value empty">—</span>;

  return (
    <div className="employee-page">

      {/* header */}
      <div className="employee-header">
        <h1>Employee List</h1>
        <div className="filters">
          <select value={division} onChange={(e) => setDivision(e.target.value)}>
            {divisions.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* table */}
      <div className="table-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th>EMP ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Designation</th>
              <th>Division</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    <p>No employees found</p>
                  </div>
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.emp_id} onClick={() => fetchEmployee(e.emp_id)}>
                  <td><span className="emp-id-badge">{e.emp_id}</span></td>
                  <td><strong>{e.name}</strong></td>
                  <td>{e.phone || "—"}</td>
                  <td>{e.designation || "—"}</td>
                  <td>{e.division}</td>
                  <td>
                    <span className={`status-pill ${e.status?.toLowerCase() === "active" ? "active" : "inactive"}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL ─────────────────────────────────────────── */}
      {selectedEmployee && (
        <div className="modal-overlay" onClick={() => setSelectedEmployee(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            {/* header */}
            <div className="modal-header">
              <div className="modal-header-info">
                <h2>{selectedEmployee.name}</h2>
                <p>
                  {selectedEmployee.designation_ipa || selectedEmployee.designation_aug || "Employee"}
                  &nbsp;·&nbsp;{selectedEmployee.division}
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedEmployee(null)}>×</button>
            </div>

            {/* body */}
            <div className="modal-body">

              {/* Basic */}
              <div className="modal-section">
                <div className="modal-section-title">Basic Info</div>
                <div className="modal-grid">
                  {[
                    ["EMP ID",    <span className="modal-field-value mono">{selectedEmployee.emp_id}</span>],
                    ["Phone",     val(selectedEmployee.phone)],
                    ["Division",  val(selectedEmployee.division)],
                    ["Status",    val(selectedEmployee.status)],
                    ["Nationality", val(selectedEmployee.nationality)],
                    ["DOB",       val(selectedEmployee.dob)],
                  ].map(([label, value]) => (
                    <div key={label} className="modal-field">
                      <div className="modal-field-label">{label}</div>
                      <div className="modal-field-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Designation & Salary */}
              <div className="modal-section">
                <div className="modal-section-title">Designation & Salary</div>
                <div className="modal-grid">
                  {[
                    ["IPA Designation", val(selectedEmployee.designation_ipa)],
                    ["Aug Designation", val(selectedEmployee.designation_aug)],
                    ["IPA Salary",      val(selectedEmployee.ipa_salary)],
                    ["Per Hour",        val(selectedEmployee.per_hr)],
                    ["Salary",          val(selectedEmployee.salary)],
                    ["Bank Account",    val(selectedEmployee.bank_account)],
                  ].map(([label, value]) => (
                    <div key={label} className="modal-field">
                      <div className="modal-field-label">{label}</div>
                      <div className="modal-field-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Permit */}
              <div className="modal-section">
                <div className="modal-section-title">Work Permit</div>
                <div className="modal-grid">
                  {[
                    ["Work Permit No",  val(selectedEmployee.work_permit_no)],
                    ["FIN No",          val(selectedEmployee.fin_no)],
                    ["Issue Date",      val(selectedEmployee.issue_date)],
                    ["WP Expiry",       val(selectedEmployee.wp_expiry)],
                    ["IC Status",       val(selectedEmployee.ic_status)],
                  ].map(([label, value]) => (
                    <div key={label} className="modal-field">
                      <div className="modal-field-label">{label}</div>
                      <div className="modal-field-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Passport */}
              <div className="modal-section">
                <div className="modal-section-title">Passport</div>
                <div className="modal-grid">
                  {[
                    ["Passport No",     val(selectedEmployee.passport_no)],
                    ["Expiry",          val(selectedEmployee.passport_expiry)],
                    ["Issue Place",     val(selectedEmployee.passport_issue_place)],
                  ].map(([label, value]) => (
                    <div key={label} className="modal-field">
                      <div className="modal-field-label">{label}</div>
                      <div className="modal-field-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="modal-section">
                <div className="modal-section-title">Certifications & Skills</div>
                <div className="modal-grid">
                  {[
                    ["SSIC GT",          val(selectedEmployee.ssic_gt_sn)],
                    ["SSIC HT",          val(selectedEmployee.ssic_ht_sn)],
                    ["Work At Height",   selectedEmployee.work_at_height ? "Yes" : "No"],
                    ["Confined Space",   selectedEmployee.confined_space ? "Yes" : "No"],
                  ].map(([label, value]) => (
                    <div key={label} className="modal-field">
                      <div className="modal-field-label">{label}</div>
                      <div className="modal-field-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              {selectedEmployee.remarks && (
                <div className="modal-section">
                  <div className="modal-section-title">Remarks</div>
                  <div className="modal-field" style={{ gridColumn: "span 2" }}>
                    <div className="modal-field-value">{selectedEmployee.remarks}</div>
                  </div>
                </div>
              )}

            </div>

            {/* footer */}
            <div className="modal-footer">
              <button className="modal-close-btn" onClick={() => setSelectedEmployee(null)}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default EmployeeList;