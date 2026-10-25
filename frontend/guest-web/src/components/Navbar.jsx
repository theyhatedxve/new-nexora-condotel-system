import { Link } from "react-router";

function Navbar() {
  return (
    <header className="navbar">
      <Link to="/" className="logo">
        NEXORA
      </Link>

      <nav className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/rooms">Rooms</Link>
      </nav>
    </header>
  );
}

export default Navbar;
