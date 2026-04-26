import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosInstance";
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
  const [status, setStatus]       = useState("idle"); // idle | ready | uploading | success | error
  const [result, setResult]       = useState(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      setErrorMsg("Only .xlsx / .xls files allowed");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("ready");
    setErrorMsg("");
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "arraybuffer", // handle both Excel + JSON responses
      });

      const contentType = res.headers["content-type"] || "";

      // ── Backend returned credentials Excel (new employees created) ──
      if (
        contentType.includes("spreadsheetml") ||
        contentType.includes("excel")
      ) {
        const created = parseInt(res.headers["x-import-created"] || "0");
        const updated = parseInt(res.headers["x-import-updated"] || "0");
        const skipped = parseInt(res.headers["x-import-skipped"] || "0");
        const total   = parseInt(res.headers["x-import-total"]   || "0");

        // Trigger browser download of credentials Excel
        const blob = new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href  = url;
        link.download = "employee_credentials.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setResult({ created, updated, skipped, total_rows: total, hasCredentials: true });
        setStatus("success");
        if (onSuccess) onSuccess();

      } else {
        // ── Normal JSON response (no new employees, only updates) ──
        const text = new TextDecoder().decode(res.data);
        const data = JSON.parse(text);
        setResult(data);
        setStatus("success");
        if (onSuccess) onSuccess();
      }

    } catch (err) {
      // arraybuffer error — decode it
      let msg = "Upload failed. Check file format and try again.";
      if (err.response?.data) {
        try {
          const text   = new TextDecoder().decode(err.response.data);
          const parsed = JSON.parse(text);
          msg = parsed.error || msg;
        } catch (_) {}
      }
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setShowErrors(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`upload-panel ${status}`}>

      {/* Header */}
      <div className="upload-panel-header">
        <div className="panel-badge">
          <Icon
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
            size={20}
          />
        </div>
        <div>
          <div className="panel-title">Employee Excel Import</div>
          <div className="panel-subtitle">
            Single file upload — IS_ACTIVE column controls active/inactive status
          </div>
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

      {/* Password info banner */}
      <div className="active-info-banner" style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" }}>
        <Icon
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          size={15}
          stroke="#1d4ed8"
        />
        <span>
          <strong>New employees:</strong> A temp password is auto-generated and a{" "}
          <strong>credentials Excel</strong> will be downloaded automatically after import.
          Employees must change their password on first login.
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
          onDrop={handleDrop}
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

      {/* File ready / uploading state */}
      {(status === "ready" || status === "uploading") && (
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

          <button
            className={`upload-btn ${status === "uploading" ? "loading" : ""}`}
            onClick={handleUpload}
            disabled={status === "uploading"}
          >
            {status === "uploading" ? (
              <>
                <span className="spinner" />
                Uploading & Processing...
              </>
            ) : (
              <>
                <Icon
                  d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
                  size={15}
                  stroke="white"
                />
                Upload & Store to Database
              </>
            )}
          </button>
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
            <span>Import Successful!</span>
          </div>

          <div className="result-stats">
            <div className="stat-pill created">
              <span className="stat-num">{result.created ?? 0}</span>
              <span className="stat-label">Created</span>
            </div>
            <div className="stat-pill updated">
              <span className="stat-num">{result.updated ?? 0}</span>
              <span className="stat-label">Updated</span>
            </div>
            <div className="stat-pill skipped">
              <span className="stat-num">{result.skipped ?? 0}</span>
              <span className="stat-label">Skipped</span>
            </div>
            <div className="stat-pill total">
              <span className="stat-num">{result.total_rows ?? 0}</span>
              <span className="stat-label">Total Rows</span>
            </div>
          </div>

          {/* 🔐 Credentials downloaded banner */}
          {result.hasCredentials && (
            <div className="credentials-banner">
              <Icon
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8"
                size={18}
                stroke="#15803d"
              />
              <span>
                <strong>Credentials Excel downloaded!</strong> Share temp passwords with
                new employees. They must change their password on first login.
              </span>
            </div>
          )}

          {/* Row-level errors from backend */}
          {result.errors && result.errors.length > 0 && (
            <div className="row-errors">
              <button
                className="row-errors-toggle"
                onClick={() => setShowErrors((v) => !v)}
              >
                <Icon
                  d={showErrors ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}
                  size={14}
                />
                {result.errors.length} row error{result.errors.length > 1 ? "s" : ""} detected
              </button>
              {showErrors && (
                <div className="row-errors-list">
                  {result.errors.map((e, i) => (
                    <div key={i} className="row-error-item">
                      <span className="row-error-loc">Row {e.row} · {e.emp_id || "—"}</span>
                      <span className="row-error-msg">{e.error}</span>
                    </div>
                  ))}
                </div>
              )}
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
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
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
              <strong>New employees</strong> get an auto-generated temp password
              delivered via downloaded Excel.
            </p>
          </div>

          <div className="import-single">
            <UploadPanel onSuccess={() => setRefreshKey((k) => k + 1)} />
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
                <strong>New employees</strong> automatically get a login account.
                Temp passwords are in the downloaded <strong>employee_credentials.xlsx</strong>.
                Employees must change password on first login.
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