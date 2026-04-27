import { Navigate } from "react-router-dom";

// Role hierarchy: admin > hr > employee
// hr gets access to any route marked requiredRole="hr" OR "admin" (they share admin UI for leave/import)
const ROLE_HOME = {
  admin: "/dashboard",
  hr: "/dashboard",       // HR lands on admin dashboard — they share the same UI
  employee: "/employee/dashboard",
};

function PrivateRoute({ children, requiredRole }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user) return <Navigate to="/" replace />;

 
  const allowed =
    user.role === requiredRole ||
    (user.role === "admin") ||                          
    (user.role === "hr" && requiredRole === "admin");   // hr shares admin-level routes

  if (!allowed) {
    const home = ROLE_HOME[user.role] || "/";
    return <Navigate to={home} replace />;
  }

  return children;
}

export default PrivateRoute;