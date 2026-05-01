import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { logout } from "../axiosInstance";
import "./Importemployees.css";

// ── Icons ─────────────────────────────────────────────────
const Icon = ({ d, size = 18, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ── All columns backend expects (matches views.py import_excel) ───────────
const ALL_COLS = [
  { col: "EMP ID",                    required: true  },
  { col: "IS_ACTIVE",                 required: false, note: "1=Active, 0=Inactive (defaults to 1)" },
  { col: "COMPANY",                   required: false },
  { col: "NAME",                      required: false },
  { col: "EMAIL",                     required: true,  note: "Required for invitation email" },
  { col: "HP NUMBER",                 required: false },
  { col: "NATIONALITY",               required: false },
  { col: "D.O.B",                     required: false },
  { col: "QUALIFICATION",             required: false },
  { col: "IPA DESIGNATION",           required: false },
  { col: "Trade",                     required: false },
  { col: "IPA SALARY",                required: false },
  { col: "PER HR",                    required: false },
  { col: "DOA",                       required: false },
  { col: "ARRIVAL DATE",              required: false },
  { col: "DATE JOINED",               required: false },
  { col: "IC / WP NO",                required: false },
  { col: "FIN NO",                    required: false },
  { col: "IC TYPE",                   required: false },
  { col: "ISSUANCE DATE",             required: false },
  { col: "S PASS/ WP EXPRIY",         required: false },
  { col: "PP.NO",                     required: false },
  { col: "PP EXPIRY",                 required: false },
  { col: "SSIC GT S/N",               required: false },
  { col: "SSIC GT EXP DATE",          required: false },
  { col: "SSIC HT S/N",               required: false },
  { col: "SSIC HT EXP DATE",          required: false },
  { col: "WORK-AT-HEIGHT",            required: false },
  { col: "CONFINED SPACE",            required: false },
  { col: "WELDER NO",                 required: false },
  { col: "LSSC S/N",                  required: false },
  { col: "SIGNALMAN & RIGGER COURSE", required: false },
  { col: "BANK ACCOUNT NUMBER",       required: false },
  { col: "ACCOMODATION",              required: false },
  { col: "PCP STATUS",                required: false },
  { col: "REMARKS",                   required: false },
];

// ── Upload Panel ──────────────────────────────────────────
function UploadPanel({ onSuccess }) {
  const [file, setFile]           = useState(null);
  const [status, setStatus]       = useState("idle"); // idle | ready | uploading | processing | success | error
  const [progress, setProgress]   = useState(0);
  const [result, setResult]       = useState(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setStatus("ready");
    setErrorMsg("");
    setResult(null);
    setProgress(0);
  };

  const pollStatus = async (id) => {
    try {
      const res = await api.get(`import/status/${id}/`);
      const job = res.data;
      
      setProgress(job.progress);
      
      if (job.status === 'completed') {
        setResult(job);
        setStatus("success");
        if (onSuccess) onSuccess();
      } else if (job.status === 'failed') {
        setErrorMsg(job.message || "Import failed.");
        setStatus("error");
      } else {
        // Keep polling
        setTimeout(() => pollStatus(id), 2000);
      }
    } catch (err) {
      setErrorMsg("Failed to track import status.");
      setStatus("error");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });


      setStatus("processing");
      pollStatus(res.data.job_id);

    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Upload failed.");
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`upload-panel ${status}`}>

      {/* Header */}
      <div className="upload-panel-header">
        <div className="panel-badge">
          <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={20} />
        </div>
        <div>
          <div className="panel-title">Employee Excel Import</div>
          <div className="panel-subtitle">Async processing with real-time progress</div>
        </div>
        {status !== "idle" && (
          <button className="panel-reset" onClick={reset} title="Reset">
            <Icon d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" size={15} />
          </button>
        )}
      </div>

      {/* IS_ACTIVE info banner */}
      <div className="active-info-banner">
        <Icon
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
          size={15}
        />
        <span>
          <strong>IS_ACTIVE column:</strong> Use <code>1</code> or <code>Y</code> for active,{" "}
          <code>0</code> or <code>N</code> for inactive. If column is missing, all rows default to{" "}
          <strong>Active</strong>.
        </span>
      </div>

      {/* Email Requirement Box */}
      <div className="active-info-banner" style={{ background: "#f0f9ff", borderColor: "#bae6fd", color: "#0369a1" }}>
        <Icon
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          size={15}
          stroke="#0369a1"
        />
        <span>
          <strong>Email Invitation:</strong> New employees will receive an <strong>email invitation</strong> to set their password securely. No passwords are generated or stored by the system. <strong>EMAIL</strong> is required for all new entries.
        </span>
      </div>

      {/* Security Info Box */}
      <div className="active-info-banner" style={{ background: "#fdf2f8", borderColor: "#fbcfe8", color: "#9d174d" }}>
        <Icon
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          size={15}
          stroke="#9d174d"
        />
        <span>
          <strong>Security:</strong> Employees set their own password using a secure, time-limited link. This ensures maximum privacy and compliance.
        </span>
      </div>

      {/* Expected columns */}
      <div className="expected-cols">
        <div className="expected-cols-label">
          Expected columns
          <span className="col-count">{ALL_COLS.length} total</span>
        </div>
        <div className="cols-list">
          {ALL_COLS.map(({ col, required, note }) => (
            <span
              key={col}
              className={`col-chip ${required ? "required" : ""}`}
              title={note || (required ? "Required" : "Optional")}
            >
              {col}
              {required && <span className="chip-required-dot" />}
            </span>
          ))}
        </div>
        <div className="col-legend">
          <span className="col-chip required" style={{ pointerEvents: "none" }}>
            EMP ID <span className="chip-required-dot" />
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted, #888)" }}>
            = Required &nbsp;|&nbsp; All other columns are optional
          </span>
        </div>
      </div>

      {/* Drop zone */}
      {status === "idle" && (
        <div
          className={`drop-zone ${dragOver ? "drag-active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className="drop-icon">
            <Icon
              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
              size={32}
            />
          </div>
          <div className="drop-text">Drop your Excel file here</div>
          <div className="drop-sub">or click to browse — .xlsx / .xls only</div>
        </div>
      )}

      {/* Progress / Processing state */}
      {(status === "uploading" || status === "processing") && (
        <div className="processing-state">
          <div className="progress-label">
            {status === "uploading" ? "Uploading file..." : `Processing employees... ${progress}%`}
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="file-ready">
          <div className="file-info">
            <div className="file-icon">
              <Icon
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"
                size={22}
              />
            </div>
            <div className="file-meta">
              <div className="file-name">{file?.name}</div>
              <div className="file-size">
                {file ? (file.size / 1024).toFixed(1) + " KB" : ""}
              </div>
            </div>
            <div className="file-check">
              <Icon d="M20 6 9 17l-5-5" size={14} stroke="white" />
            </div>
          </div>

          <button className="upload-btn" onClick={handleUpload}>Start Import</button>
        </div>
      )}

      {/* Success state */}
      {status === "success" && result && (
        <div className="result-box success">
          <div className="result-header">
            <Icon
              d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"
              size={22}
              stroke="#16a34a"
            />
            <span>Import Completed</span>
          </div>

          <div className="result-stats">
            <div className="stat-pill total">
              <span className="stat-num">{result.total_rows}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-pill success-pill">
              <span className="stat-num">{result.success_count}</span>
              <span className="stat-label">Success</span>
            </div>
            <div className="stat-pill failed-pill">
              <span className="stat-num">{result.failed_count}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>

          {result.failed_count > 0 && result.error_file_url && (
            <div className="error-download-zone">
              <p>Some rows could not be imported. Please review the error report.</p>
              <a href={result.error_file_url} className="download-btn" target="_blank" rel="noreferrer">
                Download Error Report (.xlsx)
              </a>
            </div>
          )}

          <button className="upload-again-btn" onClick={reset}>
            Upload Another File
          </button>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="result-box error">
          <div className="result-header">
            <Icon
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z"
              size={22}
              stroke="#dc2626"
            />
            <span>{errorMsg || "Upload failed"}</span>
          </div>
          <button className="upload-again-btn error" onClick={reset}>
            Try Again
          </button>
        </div>
      )}

    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
function ImportEmployees() {
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem("user") || "{}");
  const initials  = (user?.username || "A").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard-shell">

      {/* ══ SIDEBAR ══ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="sidebar-brand-name">HR Portal</div>
          <div className="sidebar-brand-sub">Admin Dashboard</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          <button className="sidebar-link" onClick={() => navigate("/dashboard")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </button>
          <button className="sidebar-link" onClick={() => navigate("/employees")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Employees
          </button>
          <button className="sidebar-link active">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Import Data
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.username || "Admin"}</div>
              <div className="sidebar-user-role">Administrator</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div className="dashboard-main">
        <div className="dashboard-topbar">
          <div className="topbar-title">Import Employee Data</div>
          <div className="topbar-actions">
            <button className="topbar-btn primary" onClick={() => navigate("/employees")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              View Employees
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="import-page-header">
            <h2>Upload Employee Excel File</h2>
            <p>
              Upload a single Excel file containing all employees. Use the{" "}
              <strong>IS_ACTIVE</strong> column to mark active (<code>1</code>) or
              inactive (<code>0</code>) employees. Existing records are{" "}
              <strong>updated</strong> by EMP ID — never duplicated.{" "}
              <strong>New employees</strong> receive an email invitation to set their
              password securely.
            </p>
          </div>

          <div className="import-single">
            <UploadPanel />
          </div>

          {/* Info notes */}
          <div className="import-notes">
            <div className="import-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                <strong>EMP ID</strong> is the only required column. All other columns
                are optional and will be skipped if missing.
              </span>
            </div>
            <div className="import-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                <strong>COMPANY</strong> column maps to Division. Valid values: PDS ENG,
                GSI ENG, PDS MARINE, PDS OFFSHORE, GSI MARINE. Unknown values are
                created automatically.
              </span>
            </div>
            <div className="import-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                <strong>Security:</strong> Employees set their own password using a
                secure, time-limited link. No passwords are ever stored in Excel files.
              </span>
            </div>
            <div className="import-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                <strong>DATE JOINED</strong> drives the auto-calculated{" "}
                <strong>Experience Years</strong> field — no manual entry needed.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportEmployees;