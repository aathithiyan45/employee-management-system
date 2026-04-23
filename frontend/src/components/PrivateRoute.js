import { Navigate } from "react-router-dom";

// 🔐 Protects routes based on login + role
function PrivateRoute({ children, requiredRole }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Not logged in → back to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Wrong role → redirect to their correct page
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === "admin") return <Navigate to="/dashboard" replace />;
    if (user.role === "employee") return <Navigate to="/profile" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PrivateRoute;