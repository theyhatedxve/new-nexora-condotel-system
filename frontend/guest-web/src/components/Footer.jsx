import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import nexoraLogo from "../assets/branding/logo-horizontal-dark.svg";

import "../styles/guest-footer.css";


const currentYear = new Date().getFullYear();

function Footer() {
  return (
    <footer className="guest-footer">
      <div className="guest-footer__inner">
        <div className="guest-footer__grid">
          <div className="guest-footer__brand">
            <Link
              to="/"
              aria-label="NEXORA home"
              className="guest-footer__logo-link"
            >
              <img
                src={nexoraLogo}
                alt=""
                width={900}
                height={260}
                className="guest-footer__logo"
              />
            </Link>

            <p>
              A space for your next stay.
            </p>
          </div>

          <nav
            aria-labelledby="footer-explore-title"
            className="guest-footer__navigation"
          >
            <h2 id="footer-explore-title">
              Explore
            </h2>

            <ul className="guest-footer__links">
              <li>
                <Link to="/">Home</Link>
              </li>

              <li>
                <Link to="/rooms">Rooms</Link>
              </li>

              <li>
                <Link to="/about">About NEXORA</Link>
              </li>

              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>
          </nav>

          <div className="guest-footer__booking">
            <h2>Your booking</h2>

            <p>
              Request a private link to access
              your reservation.
            </p>

            <Link
              to="/booking-access"
              className="guest-footer__booking-link"
            >
              Find my booking
              <ArrowRight
                size={17}
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        <div className="guest-footer__bottom">
          <p>
            {"\u00A9"} {currentYear} NEXORA.
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
