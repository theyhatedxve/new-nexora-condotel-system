
import { Outlet } from "react-router";

import Sidebar from "../components/Sidebar";
import BackendStatus from "../components/BackendStatus";

function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />

      <div className="admin-main">
        <header className="topbar">
          <span>NEXORA Management System</span>
          <span>Admin Preview</span>
        </header>

        <BackendStatus />

        <main className="admin-content">
          <Outlet />
        </main>

        <footer className="admin-footer">
          NEXORA Admin Dashboard
        </footer>
      </div>
    </div>
  );
}

export default AdminLayout;
