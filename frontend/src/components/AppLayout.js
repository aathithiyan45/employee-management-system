import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function AppLayout() {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
