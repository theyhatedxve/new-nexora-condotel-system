import { Outlet } from "react-router";
import Navbar from "../components/Navbar";
import BackendStatus from "../components/BackendStatus";
import Footer from "../components/Footer";
import useGuestLayout from "../hooks/useGuestLayout.js";

function GuestLayout() {
  const { mainContentRef } = useGuestLayout();

  return (
    <div className="site">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Navbar />
      <BackendStatus />

      <div id="main-content" ref={mainContentRef} className="site-content" tabIndex={-1}>
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
export default GuestLayout;
