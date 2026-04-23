import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import EmployeeList from "./components/EmployeeList";
import Profile from "./components/Profile";
import PrivateRoute from "./components/PrivateRoute";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔓 Public — Login */}
        <Route path="/" element={<Login />} />

        {/* 🔐 Admin only */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute requiredRole="admin">
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <PrivateRoute requiredRole="admin">
              <EmployeeList />
            </PrivateRoute>
          }
        />

        {/* 🔐 Employee only */}
        <Route
          path="/profile"
          element={
            <PrivateRoute requiredRole="employee">
              <Profile />
            </PrivateRoute>
          }
        />

        {/* 🔁 Catch-all → Login */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;