import { Outlet } from "react-router";

import Navbar from "../components/Navbar";
import BackendStatus from "../components/BackendStatus";
import Footer from "../components/Footer";

function GuestLayout() {
  return (
    <div className="site">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Navbar />
      <BackendStatus />

      <div id="main-content" className="site-content" tabIndex={-1}>
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}

export default GuestLayout;