import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Login          from "./pages/Login";
import Dashboard      from "./pages/Dashboard";
import HRDashboard    from "./pages/HRDashboard";
import EmployeeList   from "./pages/EmployeeList";
import EmployeeDetail from "./pages/EmployeeDetail";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Profile        from "./components/Profile";
import ImportEmployees from "./pages/Importemployees";
import LeaveManagement from "./pages/LeaveManagement";
import LeaveBalance   from "./pages/LeaveBalance";
import ChangePassword from "./pages/ChangePassword";
import SetPassword    from "./pages/SetPassword";
import AuditLogs      from "./pages/AuditLogs";
import Documents     from "./pages/Documents";
import WorkLog       from "./pages/WorkLog";
import Payroll       from "./pages/Payroll";
import PayrollAnalytics from "./pages/PayrollAnalytics";
import PrivateRoute   from "./components/PrivateRoute";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ─────────────────────────────────────── */}
        <Route path="/" element={<Login />} />
        <Route path="/set-password/:uid/:token" element={<SetPassword />} />

        {/* ── Admin only ──────────────────────────────────── */}
        <Route path="/dashboard" element={
          <PrivateRoute requiredRole="admin"><Dashboard /></PrivateRoute>
        } />
        <Route path="/employees" element={
          <PrivateRoute requiredRole="admin"><EmployeeList /></PrivateRoute>
        } />
        <Route path="/employees/:empId" element={
          <PrivateRoute requiredRole="admin"><EmployeeDetail /></PrivateRoute>
        } />
        <Route path="/employees/:empId/profile" element={
          <PrivateRoute requiredRole="admin"><EmployeeProfile /></PrivateRoute>
        } />
        <Route path="/import" element={
          <PrivateRoute requiredRole="admin"><ImportEmployees /></PrivateRoute>
        } />
        <Route path="/audit-logs" element={
          <PrivateRoute requiredRole="admin"><AuditLogs /></PrivateRoute>
        } />

        {/* ── Admin + HR shared routes ─────────────────────
            PrivateRoute allows hr role on "admin" routes    */}
        <Route path="/leave" element={
          <PrivateRoute requiredRole="admin"><LeaveManagement /></PrivateRoute>
        } />
        <Route path="/leave/balance/:empId" element={
          <PrivateRoute requiredRole="admin"><LeaveBalance /></PrivateRoute>
        } />
        <Route path="/worklog" element={
          <PrivateRoute requiredRole="admin"><WorkLog /></PrivateRoute>
        } />
        <Route path="/payroll" element={
          <PrivateRoute requiredRole="admin"><Payroll /></PrivateRoute>
        } />
        <Route path="/payroll-analytics" element={
          <PrivateRoute requiredRole="admin"><PayrollAnalytics /></PrivateRoute>
        } />

        {/* ── HR only ─────────────────────────────────────── */}
        <Route path="/hr/dashboard" element={
          <PrivateRoute requiredRole="hr"><HRDashboard /></PrivateRoute>
        } />

        {/* ── Employee only ────────────────────────────────── */}
        <Route path="/employee/dashboard" element={
          <PrivateRoute requiredRole="employee"><EmployeeDashboard /></PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute requiredRole="employee"><Profile /></PrivateRoute>
        } />

        {/* ── Authenticated — any role ─────────────────────── */}
        <Route path="/change-password" element={
          <PrivateRoute requiredRole="any"><ChangePassword /></PrivateRoute>
        } />
        <Route path="/documents" element={
          <PrivateRoute requiredRole="any"><Documents /></PrivateRoute>
        } />

        {/* ── 404 catch-all — must be last ────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;