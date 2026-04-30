import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";

// Base URL pulled from env var — falls back to localhost for development.
// In production set REACT_APP_API_URL in your .env file.
const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

// Role definitions — each maps to a server-side role value
const ROLES = [
  { id: "admin",    label: "Admin",    subtitle: "management dashboard" },
  { id: "hr",       label: "HR",       subtitle: "HR portal" },
  { id: "employee", label: "Employee", subtitle: "employee profile" },
];

// Where each role lands after login
const ROLE_HOME = {
  admin:    "/dashboard",
  hr:       "/hr/dashboard",
  employee: "/employee/dashboard",
};

function Login() {
  const [role, setRole]         = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const navigate = useNavigate();

  const selectedRole = ROLES.find(r => r.id === role);

  const handleLogin = async () => {
    setError("");
    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/login/`, { username, password }, { withCredentials: true });
      const data = res.data;

      // Validate the selected role matches the server-side role
      if (data.role !== role) {
        setError(`This account is not a${role === "admin" ? "n" : ""} ${selectedRole.label} account.`);
        return;
      }

      // Persist session
      localStorage.setItem("user",    JSON.stringify(data));
      localStorage.setItem("access",  data.access);

      // Force password change on first login
      if (data.must_change_password) {
        navigate("/change-password");
        return;
      }

      // Navigate to role-specific home
      navigate(ROLE_HOME[data.role] || "/");

    } catch (err) {
      // Use the server's message if available, otherwise generic
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="login-brand-name">HR <span>Portal</span></div>
          </div>
        </div>

        <h2 className="login-title">{selectedRole.label} Login</h2>
        <p className="login-subtitle">
          Sign in to access your {selectedRole.subtitle}
        </p>

        {/* Role toggle — now includes HR */}
        <div className="role-toggle">
          {ROLES.map(r => (
            <button
              key={r.id}
              className={role === r.id ? "active" : ""}
              onClick={() => { setRole(r.id); setError(""); }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Error message — replaces window.alert() */}
        {error && (
          <div className="login-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Username / EMP ID */}
        <div className="login-field">
          <label>{role === "employee" ? "Employee ID" : "Username"}</label>
          <input
            type="text"
            placeholder={role === "employee" ? "Enter Employee ID" : "Enter username"}
            value={username}
            onChange={e => { setUsername(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            autoFocus
          />
        </div>

        {/* Password */}
        <div className="login-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
        </div>

        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>

      </div>
    </div>
  );
}

export default Login;