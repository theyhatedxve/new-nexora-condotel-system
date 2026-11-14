import { BrowserRouter, Routes, Route, Navigate } from "react-router";

import GuestLayout from "./layouts/GuestLayout";
import GuestAuthProvider from "./auth/GuestAuthProvider";
import GuestRoute from "./auth/GuestRoute";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Logout from "./pages/Logout.jsx";
import Home from "./pages/Home";
import Rooms from "./pages/Rooms";
import RoomDetails from "./pages/RoomDetails";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Policies from "./pages/Policies.jsx";

import "./styles/tokens.css";
import "./styles/global.css";

import Checkout from "./pages/Checkout.jsx";
import BookingAccess from "./pages/BookingAccess.jsx";
import MyBooking from "./pages/MyBooking.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import PaymentReturn from './pages/PaymentReturn.jsx';

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
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/rooms/:id" element={<RoomDetails />} />
            <Route element={<GuestRoute />}>
              <Route path="/checkout/:roomTypeId" element={<Checkout />} />
              <Route path="/payment-return" element={<PaymentReturn />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/my-bookings/:reservationId" element={<MyBooking />} />
              <Route path="/my-booking" element={<Navigate to="/my-bookings" replace />} />
            </Route>
            <Route path="/booking-access" element={<BookingAccess />} />
          </Route>
        </Routes>
      </GuestAuthProvider>
    </BrowserRouter>
  );
}

export default App;
