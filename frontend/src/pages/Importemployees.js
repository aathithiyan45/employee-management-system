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

// ── Column maps ───────────────────────────────────────────
const CURRENT_COLS = [
  "EMP ID", "NAME", "HP NUMBER", "IPA DESIGNATION", "Trade",
  "IPA SALARY", "PER HR", "IC / WP NO", "FIN NO", "ISSUANCE DATE",
  "IC TYPE", "S PASS/ WP EXPRIY", "PP.NO", "PP EXPIRY",
  "NATIONALITY", "D.O.B", "WORK-AT-HEIGHT", "CONFINED SPACE",
  "WELDER NO", "LSSC S/N", "SIGNALMAN & RIGGER COURSE",
  "BANK ACCOUNT NUMBER", "ACCOMODATION", "PCP STATUS",
];

const CANCELLED_COLS = ["EMP ID", "NAME"];

function parseExcelPreview(file, sheetIndex = 0) {
  // We'll read via FileReader and parse headers from first row
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Basic CSV-like sniff — for Excel we just confirm file exists
        resolve({ ok: true, name: file.name, size: file.size });
      } catch {
        resolve({ ok: false });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── Upload Panel ──────────────────────────────────────────
function UploadPanel({ type, onSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | ready | uploading | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const isCurrent = type === "current";
  const label = isCurrent ? "Current Employees" : "Cancelled Employees";
  const accent = isCurrent ? "green" : "red";

  const handleFile = async (f) => {
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
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sheet_type", type); // "current" or "cancelled"

    try {
      const res = await api.post("import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      setStatus("success");
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error || "Upload failed. Check file and try again."
      );
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`upload-panel ${accent} ${status}`}>
      {/* Header */}
      <div className="upload-panel-header">
        <div className={`panel-badge ${accent}`}>
          {isCurrent ? (
            <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" size={20} />
          ) : (
            <Icon d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" size={20} />
          )}
        </div>
        <div>
          <div className="panel-title">{label}</div>
          <div className="panel-subtitle">
            {isCurrent
              ? "Upload Excel with active employee records"
              : "Upload Excel with cancelled/terminated records"}
          </div>
        </div>
        {(status === "ready" || status === "success" || status === "error") && (
          <button className="panel-reset" onClick={reset} title="Reset">
            <Icon d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" size={15} />
          </button>
        )}
      </div>

      {/* Expected columns */}
      <div className="expected-cols">
        <div className="expected-cols-label">Expected columns:</div>
        <div className="cols-list">
          {(isCurrent ? CURRENT_COLS : CANCELLED_COLS).map((col) => (
            <span key={col} className="col-chip">{col}</span>
          ))}
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
            <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={32} />
          </div>
          <div className="drop-text">Drop your Excel file here</div>
          <div className="drop-sub">or click to browse — .xlsx / .xls only</div>
        </div>
      )}

      {/* File ready state */}
      {(status === "ready" || status === "uploading") && (
        <div className="file-ready">
          <div className="file-info">
            <div className="file-icon">
              <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" size={22} />
            </div>
            <div className="file-meta">
              <div className="file-name">{file?.name}</div>
              <div className="file-size">
                {file ? (file.size / 1024).toFixed(1) + " KB" : ""}
              </div>
            </div>
            <div className={`file-check ${accent}`}>
              <Icon d="M20 6 9 17l-5-5" size={14} stroke="white" />
            </div>
          </div>

          <button
            className={`upload-btn ${accent} ${status === "uploading" ? "loading" : ""}`}
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
                <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={15} stroke="white" />
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
            <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" size={22} stroke="#16a34a" />
            <span>Import Successful!</span>
          </div>
          <div className="result-stats">
            {isCurrent ? (
              <>
                <div className="stat-pill created">
                  <span className="stat-num">{result.created}</span>
                  <span className="stat-label">Created</span>
                </div>
                <div className="stat-pill updated">
                  <span className="stat-num">{result.updated}</span>
                  <span className="stat-label">Updated</span>
                </div>
              </>
            ) : (
              <div className="stat-pill inactivated">
                <span className="stat-num">{result.inactivated ?? result.updated ?? 0}</span>
                <span className="stat-label">Inactivated</span>
              </div>
            )}
          </div>
          <button className="upload-again-btn" onClick={reset}>
            Upload Another File
          </button>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="result-box error">
          <div className="result-header">
            <Icon d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" size={22} stroke="#dc2626" />
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
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const initials = (user?.username || "A").slice(0, 2).toUpperCase();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="dashboard-shell">
      {/* ══ SIDEBAR (same as Dashboard) ══ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
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
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </button>
          <button className="sidebar-link" onClick={() => navigate("/employees")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Employees
          </button>
          <button className="sidebar-link active">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              View Employees
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="import-page-header">
            <h2>Upload Employee Excel Files</h2>
            <p>
              Upload separate Excel files for <strong>Current</strong> and <strong>Cancelled</strong> employees.
              Data will be previewed before storing to the database.
            </p>
          </div>

          <div className="import-grid">
            <UploadPanel
              type="current"
              onSuccess={() => setRefreshKey(k => k + 1)}
            />
            <UploadPanel
              type="cancelled"
              onSuccess={() => setRefreshKey(k => k + 1)}
            />
          </div>

          {/* Info note */}
          <div className="import-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              Existing employees will be <strong>updated</strong> (not duplicated) based on EMP ID.
              Current employees are marked <strong>active</strong>, cancelled employees are marked <strong>inactive</strong>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportEmployees;