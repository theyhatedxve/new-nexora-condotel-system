
import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";

import Navbar from "../components/Navbar";
import BackendStatus from "../components/BackendStatus";
import Footer from "../components/Footer";

function GuestLayout() {
  const location = useLocation();
  const mainContentRef = useRef(null);
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    // Move focus only when navigating to another route.
    if (previousPathRef.current !== location.pathname) {
      mainContentRef.current?.focus();
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <div className="site">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Navbar />
      <BackendStatus />

      <div
        id="main-content"
        ref={mainContentRef}
        className="site-content"
        tabIndex={-1}
      >
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}

export default GuestLayout;
