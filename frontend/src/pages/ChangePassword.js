import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axiosInstance";

function ChangePassword() {
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleSubmit = async () => {
    setError("");
    if (!newPassword || !confirmPassword) { setError("Both fields are required"); return; }
    if (newPassword !== confirmPassword)  { setError("Passwords do not match"); return; }
    if (newPassword.length < 8)           { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    try {
      await api.post("change-password/", {
        new_password:     newPassword,
        confirm_password: confirmPassword,
      });

      // Update localStorage — clear must_change_password flag
      const updated = { ...user, must_change_password: false };
      localStorage.setItem("user", JSON.stringify(updated));

      // Redirect based on role
      navigate(user.role === "admin" ? "/dashboard" : "/hr/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1e3a5f 0%, #1565c0 55%, #00796b 100%)"
    }}>
      <div style={{
        background: "white", borderRadius: "16px", padding: "48px 44px",
        width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
      }}>
        {/* Icon */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "14px",
            background: "linear-gradient(135deg, #1565c0, #00796b)",
            display: "inline-flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#111", marginBottom: "6px", textAlign: "center" }}>
          Set New Password
        </h2>
        <p style={{ fontSize: "13.5px", color: "#9aa5b4", textAlign: "center", marginBottom: "32px" }}>
          You must change your temporary password before continuing.
        </p>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px",
            padding: "10px 14px", marginBottom: "20px", fontSize: "13.5px", color: "#dc2626"
          }}>
            {error}
          </div>
        )}

        {/* New Password */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{
            display: "block", fontSize: "12px", fontWeight: 600,
            color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "7px"
          }}>New Password</label>
          <input
            type="password"
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "11px 14px",
              border: "1.5px solid #e5e7eb", borderRadius: "8px",
              fontSize: "14.5px", color: "#111", background: "#f9fafb",
              boxSizing: "border-box", outline: "none"
            }}
          />
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block", fontSize: "12px", fontWeight: 600,
            color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "7px"
          }}>Confirm Password</label>
          <input
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "11px 14px",
              border: "1.5px solid #e5e7eb", borderRadius: "8px",
              fontSize: "14.5px", color: "#111", background: "#f9fafb",
              boxSizing: "border-box", outline: "none"
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "13px",
            background: loading ? "#93c5fd" : "linear-gradient(135deg, #1565c0, #1976d2)",
            color: "white", border: "none", borderRadius: "8px",
            fontSize: "15px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(21,101,192,0.35)"
          }}
        >
          {loading ? "Saving..." : "Set New Password"}
        </button>
      </div>
    </div>
  );
}

export default ChangePassword;