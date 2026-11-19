import { Outlet } from "react-router";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import useGuestLayout from "../hooks/useGuestLayout.js";
import "../styles/guest-luxury.css";

function GuestLayout() {
  const { mainContentRef } = useGuestLayout();

  return (
    <div className="site site--luxury">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Navbar />

      <div id="main-content" ref={mainContentRef} className="site-content" tabIndex={-1}>
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
export default GuestLayout;
