import { BrowserRouter, Routes, Route, Navigate } from "react-router";

import GuestLayout from "./layouts/GuestLayout.jsx";
import GuestAuthProvider from "../features/auth/GuestAuthProvider.jsx";
import GuestRoute from "../features/auth/GuestRoute.jsx";
import Login from "../features/auth/pages/Login.jsx";
import Register from "../features/auth/pages/Register.jsx";
import VerifyEmail from "../features/auth/pages/VerifyEmail.jsx";
import Logout from "../features/auth/pages/Logout.jsx";
import AccountSecurity from "../features/auth/pages/AccountSecurity.jsx";
import ForgotPassword from "../features/auth/pages/ForgotPassword.jsx";
import GuestCredentialLink from "../features/auth/pages/GuestCredentialLink.jsx";
import Home from "../features/home/pages/Home.jsx";
import Rooms from "../features/rooms/pages/Rooms.jsx";
import RoomDetails from "../features/rooms/pages/RoomDetails.jsx";
import About from "../features/information/pages/About.jsx";
import Contact from "../features/information/pages/Contact.jsx";
import Policies from "../features/information/pages/Policies.jsx";

import "../shared/styles/tokens.css";
import "../shared/styles/global.css";

import Checkout from "../features/checkout/pages/Checkout.jsx";
import BookingAccessRedirect from "../features/booking/pages/BookingAccessRedirect.jsx";
import BookingDetails from "../features/booking/pages/BookingDetails.jsx";
import MyBookings from "../features/booking/pages/MyBookings.jsx";
import PaymentReturn from '../features/payments/pages/PaymentReturn.jsx';

function App() {
  return (
    <BrowserRouter>
      <GuestAuthProvider>
        <Routes>
          <Route element={<GuestLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<GuestCredentialLink reset />} />
            <Route path="/confirm-email" element={<GuestCredentialLink />} />
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/rooms/:id" element={<RoomDetails />} />
            <Route element={<GuestRoute />}>
              <Route path="/account/security" element={<AccountSecurity />} />
              <Route path="/checkout/:roomTypeId" element={<Checkout />} />
              <Route path="/payment-return" element={<PaymentReturn />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/my-bookings/:reservationId" element={<BookingDetails />} />
              <Route path="/my-booking" element={<Navigate to="/my-bookings" replace />} />
            </Route>
            <Route path="/booking-access" element={<BookingAccessRedirect />} />
          </Route>
        </Routes>
      </GuestAuthProvider>
    </BrowserRouter>
  );
}

export default App;
