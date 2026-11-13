import { Link, NavLink } from "react-router";
import { Menu, X } from "lucide-react";
import nexoraLogo from "../assets/branding/logo-horizontal-dark.svg";
import { useGuestAuth } from "../auth/useGuestAuth";
import useGuestNavigation from "../hooks/useGuestNavigation";
import "../styles/guest-header.css";

const navigation = [
  { to: "/", label: "Home", end: true },
  { to: "/rooms", label: "Rooms" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/policies", label: "Policies" },
];

export default function Navbar() {
  const auth = useGuestAuth();
  const {
    menuOpen,
    toggleMenu,
    menuButtonRef,
    closeMenu,
    handleKeyDown,
  } = useGuestNavigation();

  const authenticated = auth.status === "authenticated";
  const sessionError = auth.status === "error" || auth.status === "logout-error";

  function signOut() {
    closeMenu();
    void auth.signOut();
  }

  function retrySession() {
    void auth.retry();
  }

  return (
    <header className="guest-header" onKeyDown={handleKeyDown}>
      <div className="guest-header__inner">
        <Link
          to="/"
          className="guest-header__brand"
          aria-label="NEXORA home"
          onClick={closeMenu}
        >
          <img
            src={nexoraLogo}
            alt=""
            width={900}
            height={260}
            className="guest-header__logo"
          />
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          className="guest-header__toggle"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="guest-main-navigation"
          onClick={toggleMenu}
        >
          {menuOpen ? (
            <X size={24} aria-hidden="true" />
          ) : (
            <Menu size={24} aria-hidden="true" />
          )}
        </button>

        <nav
          id="guest-main-navigation"
          aria-label="Main navigation"
          className={
            menuOpen
              ? "guest-header__navigation is-open"
              : "guest-header__navigation"
          }
        >
          <div className="guest-header__links">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="guest-header__link"
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}

            {authenticated && auth.user.role === "GUEST" && (
              <NavLink
                to="/my-bookings"
                className="guest-header__link"
                onClick={closeMenu}
              >
                My Bookings
              </NavLink>
            )}
          </div>

          <div className="guest-header__actions">
            {auth.status === "loading" && (
              <span className="guest-header__session" role="status">
                Checking session…
              </span>
            )}

            {auth.status === "anonymous" && (
              <NavLink
                to="/login"
                className="guest-header__account"
                onClick={closeMenu}
              >
                Sign In
              </NavLink>
            )}

            {authenticated && (
              <>
                {auth.user.role !== "GUEST" && (
                  <Link
                    to="/login"
                    className="guest-header__link"
                    onClick={closeMenu}
                  >
                    Staff account
                  </Link>
                )}
                <button
                  type="button"
                  className="guest-header__account"
                  onClick={signOut}
                >
                  Sign Out
                </button>
              </>
            )}

            <Link
              to="/rooms"
              className="guest-header__explore"
              onClick={closeMenu}
            >
              Explore Rooms
            </Link>
          </div>
        </nav>
      </div>

      {sessionError && (
        <div className="guest-header__feedback">
          <p role="alert">{auth.message}</p>
          <button
            type="button"
            className="guest-header__account"
            onClick={retrySession}
          >
            {auth.status === "logout-error" ? "Retry Sign Out" : "Retry Session"}
          </button>
        </div>
      )}
    </header>
  );
}
