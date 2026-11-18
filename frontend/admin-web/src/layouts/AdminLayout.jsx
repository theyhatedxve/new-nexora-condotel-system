import { Outlet } from "react-router";
import { Menu, X } from "lucide-react";

import Sidebar from "../components/Sidebar";
import AdminHeader from "../components/AdminHeader";
import useAdminLayout from "../hooks/useAdminLayout.js";

import "../styles/admin-shell.css";

export default function AdminLayout() {
  const {
    user,
    open,
    menuButton,
    main,
    title,
    closeMenu,
    handleKeyDown,
    toggleMenu,
    signOutStaff,
  } = useAdminLayout();

  return (
    <div
      className="admin-layout admin-layout--operations"
      onKeyDown={handleKeyDown}
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <button
        type="button"
        ref={menuButton}
        className="mobile-menu"
        aria-expanded={open}
        aria-controls="staff-navigation"
        onClick={toggleMenu}
      >
        {open ? (
          <X size={20} aria-hidden="true" />
        ) : (
          <Menu size={20} aria-hidden="true" />
        )}

        {open ? "Close navigation" : "Open navigation"}
      </button>

      <Sidebar
        user={user}
        open={open}
        onNavigate={closeMenu}
        onSignOut={signOutStaff}
      />

      <div className="admin-main">
        <AdminHeader
          title={title}
          user={user}
          onSignOut={signOutStaff}
        />

        <main
          id="main-content"
          ref={main}
          tabIndex={-1}
          className="admin-content"
        >
          <Outlet />
        </main>

        <footer className="admin-footer">
          NEXORA · Staff workspace
        </footer>
      </div>
    </div>
  );
}