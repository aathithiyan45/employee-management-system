import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Enter username & password");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/login/", {
        username,
        password,
      });
      const data = res.data;

      if (role === "admin" && data.role !== "admin") {
        alert("❌ Not an admin account");
        return;
      }
      if (role === "employee" && data.role !== "employee") {
        alert("❌ Not an employee account");
        return;
      }

      // Backend returns: { status, username, role, must_change_password, emp_id, access, refresh }
      localStorage.setItem("user", JSON.stringify(data));

      if (data.role === "admin") navigate("/dashboard");
      else navigate("/profile");
    } catch {
      alert("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        <h2 className="login-title">
          {role === "admin" ? "Admin Login" : "Employee Login"}
        </h2>
        <p className="login-subtitle">
          Sign in to access your {role === "admin" ? "management dashboard" : "employee profile"}
        </p>

        <div className="role-toggle">
          <button className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}>Admin</button>
          <button className={role === "employee" ? "active" : ""} onClick={() => setRole("employee")}>Employee</button>
        </div>

        <div className="login-field">
          <label>{role === "admin" ? "Username" : "Employee ID"}</label>
          <input
            type="text"
            placeholder={role === "admin" ? "Enter username" : "Enter Employee ID"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        <div className="login-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}

export default Login;