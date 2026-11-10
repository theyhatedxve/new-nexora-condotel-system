import { Outlet } from "react-router";
import { Menu, X, LogOut } from "lucide-react";
import Sidebar from "../components/Sidebar";
import BackendStatus from "../components/BackendStatus";
import { ROLE_LABELS } from "../auth/staffNavigation";
import useAdminLayout from "../hooks/useAdminLayout.js";

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
    <div className="admin-layout" onKeyDown={handleKeyDown}>
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

      <Sidebar role={user.role} open={open} onNavigate={closeMenu} />

      <div className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">NEXORA Management System</p>

            <p className="header-title">{title}</p>
          </div>

          <div className="staff-account">
            <span>{ROLE_LABELS[user.role]}</span>

            <button type="button" className="secondary-button" onClick={signOutStaff}>
              <LogOut size={18} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </header>

        <BackendStatus />

        <main id="main-content" ref={main} tabIndex={-1} className="admin-content">
          <Outlet />
        </main>

        <footer className="admin-footer">NEXORA · Staff workspace</footer>
      </div>
    </div>
  );
}
