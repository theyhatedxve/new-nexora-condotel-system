import { useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { Menu, X } from "lucide-react";

import nexoraLogo from "../assets/branding/logo-horizontal-dark.svg";

import "../styles/guest-header.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && menuOpen) {
      event.preventDefault();
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }

  return (
    <header
      className="guest-header"
      onKeyDown={handleKeyDown}
    >
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
          aria-label={
            menuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          aria-controls="guest-main-navigation"
          onClick={() =>
            setMenuOpen((open) => !open)
          }
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
          <NavLink
            to="/"
            end
            className="guest-header__link"
            onClick={closeMenu}
          >
            Home
          </NavLink>

          <NavLink
            to="/rooms"
            className="guest-header__link"
            onClick={closeMenu}
          >
            Rooms
          </NavLink>

          <NavLink
            to="/about"
            className="guest-header__link"
            onClick={closeMenu}
          >
            About
          </NavLink>

          <NavLink
            to="/contact"
            className="guest-header__link"
            onClick={closeMenu}
          >
            Contact
          </NavLink>

          <NavLink
            to="/my-booking"
            className="guest-header__link guest-header__booking-link"
            onClick={closeMenu}
          >
            My Booking
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
