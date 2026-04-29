import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const home = user?.role === "admin"    ? "/dashboard"
             : user?.role === "hr"       ? "/hr/dashboard"
             : user?.role === "employee" ? "/employee/dashboard"
             : "/";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      fontFamily: "var(--font, DM Sans, sans-serif)",
      background: "var(--grey-100, #f0f2f5)",
      padding: 24,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 80, fontWeight: 800, color: "var(--blue-700, #1565C0)", lineHeight: 1 }}>404</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--grey-900, #1a202c)" }}>Page Not Found</div>
      <div style={{ fontSize: 14, color: "var(--grey-600, #5c6b7e)", maxWidth: 340 }}>
        The page you're looking for doesn't exist or you don't have permission to view it.
      </div>
      <button
        onClick={() => navigate(home)}
        style={{
          marginTop: 8,
          padding: "10px 24px",
          background: "var(--blue-700, #1565C0)",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {user ? "Back to Dashboard" : "Back to Login"}
      </button>
    </div>
  );
}

export default NotFound;