import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Outlet,
  useLocation,
} from "react-router";

import {
  Menu,
  X,
  LogOut,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import BackendStatus from "../components/BackendStatus";
import { useAuth } from "../auth/useAuth";

import {
  ROLE_LABELS,
  staffNavigation,
} from "../auth/staffNavigation";

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const [openedAt, setOpenedAt] = useState(null);
  const open = openedAt === location.key;

  const menuButton = useRef(null);
  const main = useRef(null);

  const title =
    staffNavigation.find(
      (item) => item.path === location.pathname,
    )?.label ?? "Page not found";

  useEffect(() => {
    document.title = title + " | NEXORA";
    main.current?.focus();
  }, [location.pathname, title]);

  function closeMenu() {
    setOpenedAt(null);
    main.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && open) {
      setOpenedAt(null);
      menuButton.current?.focus();
    }
  }

  return (
    <div
      className="admin-layout"
      onKeyDown={handleKeyDown}
    >
      <a
        className="skip-link"
        href="#main-content"
      >
        Skip to main content
      </a>

      <button
        type="button"
        ref={menuButton}
        className="mobile-menu"
        aria-expanded={open}
        aria-controls="staff-navigation"
        onClick={() =>
          setOpenedAt(open ? null : location.key)
        }
      >
        {open ? (
          <X size={20} aria-hidden="true" />
        ) : (
          <Menu size={20} aria-hidden="true" />
        )}

        {open
          ? "Close navigation"
          : "Open navigation"}
      </button>

      <Sidebar
        role={user.role}
        open={open}
        onNavigate={closeMenu}
      />

      <div className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">
              NEXORA Management System
            </p>

            <p className="header-title">
              {title}
            </p>
          </div>

          <div className="staff-account">
            <span>
              {ROLE_LABELS[user.role]}
            </span>

            <button
              type="button"
              className="secondary-button"
              onClick={() => void signOut()}
            >
              <LogOut
                size={18}
                aria-hidden="true"
              />
              Sign out
            </button>
          </div>
        </header>

        <BackendStatus />

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