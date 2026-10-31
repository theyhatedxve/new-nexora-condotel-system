import { useState } from "react";
import { Link, NavLink } from "react-router";
import { Menu, X } from "lucide-react";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="navbar">
      <Link to="/" className="logo" onClick={closeMenu}>
        NEXORA
      </Link>

      <button
        type="button"
        className="nav-toggle"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      <nav
        id="main-navigation"
        aria-label="Main navigation"
        className={menuOpen ? "nav-links is-open" : "nav-links"}
      >
        <NavLink to="/" end onClick={closeMenu}>
          Home
        </NavLink>
        <NavLink to="/rooms" onClick={closeMenu}>
          Rooms
        </NavLink>
      </nav>
    </header>
  );
}

export default Navbar;