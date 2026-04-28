import { Navigate } from "react-router-dom";

// Where each role goes after login — used for wrong-role redirects
const ROLE_HOME = {
  admin:    "/dashboard",
  hr:       "/hr/dashboard",
  employee: "/employee/dashboard",
};

/**
 * PrivateRoute — role-aware route guard.
 *
 * requiredRole values:
 *   "admin"    → admin only
 *   "hr"       → HR only (but admin can also access)
 *   "employee" → employee only
 *   "any"      → any authenticated user (e.g. /change-password)
 *
 * Role hierarchy:
 *   admin  → can access admin + hr + any routes
 *   hr     → can access hr + admin (leave/employees) + any routes
 *   employee → can access employee + any routes
 */
function PrivateRoute({ children, requiredRole }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Not logged in → back to login
  if (!user) return <Navigate to="/" replace />;

  const role = user.role;

  // "any" — just needs to be authenticated
  if (requiredRole === "any") return children;

  const allowed =
    role === "admin" ||                             // admin can access everything
    role === requiredRole ||                        // exact match
    (role === "hr" && requiredRole === "admin");    // hr shares admin-level routes (leave, employees)

  if (!allowed) {
    // Redirect to the user's correct home instead of a blank page
    return <Navigate to={ROLE_HOME[role] || "/"} replace />;
  }

  return children;
}

export default PrivateRoute;