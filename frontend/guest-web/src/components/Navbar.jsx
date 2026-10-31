
import { useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { Menu, X } from "lucide-react";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleMenuKeyDown(event) {
    if (event.key === "Escape" && menuOpen) {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }

  return (
    <header className="navbar">
      <Link
        to="/"
        className="logo"
        onClick={closeMenu}
      >
        NEXORA
      </Link>

      <button
        ref={menuButtonRef}
        type="button"
        className="nav-toggle"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? (
          <X size={28} aria-hidden="true" />
        ) : (
          <Menu size={28} aria-hidden="true" />
        )}
      </button>

      <nav
        id="main-navigation"
        aria-label="Main navigation"
        className={
          menuOpen ? "nav-links is-open" : "nav-links"
        }
        onKeyDown={handleMenuKeyDown}
      >
        <NavLink
          to="/"
          end
          onClick={closeMenu}
        >
          Home
        </NavLink>

        <NavLink
          to="/rooms"
          onClick={closeMenu}
        >
          Rooms
        </NavLink>
      </nav>
    </header>
  );
}

export default Navbar;
