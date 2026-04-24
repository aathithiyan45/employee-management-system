import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeeList from "./pages/EmployeeList";
import EmployeeDetail from "./pages/EmployeeDetail";
import EmployeeProfile from "./pages/EmployeeProfile";
import Profile from "./components/Profile";
import ImportEmployees from "./pages/Importemployees";
import LeaveManagement from "./pages/LeaveManagement";
import LeaveBalance from "./pages/LeaveBalance";
import PrivateRoute from "./components/Privateroute";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Admin only */}
        <Route path="/dashboard" element={<PrivateRoute requiredRole="admin"><Dashboard /></PrivateRoute>} />
        <Route path="/employees" element={<PrivateRoute requiredRole="admin"><EmployeeList /></PrivateRoute>} />
        <Route path="/employees/:empId" element={<PrivateRoute requiredRole="admin"><EmployeeDetail /></PrivateRoute>} />
        <Route path="/employees/:empId/profile" element={<PrivateRoute requiredRole="admin"><EmployeeProfile /></PrivateRoute>} />
        <Route path="/import" element={<PrivateRoute requiredRole="admin"><ImportEmployees /></PrivateRoute>} />
        <Route path="/leave" element={<PrivateRoute requiredRole="admin"><LeaveManagement /></PrivateRoute>} />
        <Route path="/leave/balance/:empId" element={<PrivateRoute requiredRole="admin"><LeaveBalance /></PrivateRoute>} />

        {/* Employee only */}
        <Route path="/profile" element={<PrivateRoute requiredRole="employee"><Profile /></PrivateRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;