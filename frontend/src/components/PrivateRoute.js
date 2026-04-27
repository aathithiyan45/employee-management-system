import { Navigate } from "react-router-dom";

function PrivateRoute({ children, requiredRole }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) return <Navigate to="/" replace />;

  if (requiredRole && user.role !== requiredRole) {
    if (user.role === "admin") return <Navigate to="/dashboard" replace />;
    if (user.role === "employee") return <Navigate to="/employee/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PrivateRoute;