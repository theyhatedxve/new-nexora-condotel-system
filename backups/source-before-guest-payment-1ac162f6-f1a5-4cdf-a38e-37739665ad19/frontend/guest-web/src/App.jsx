import { BrowserRouter, Routes, Route } from "react-router";

import GuestLayout from "./layouts/GuestLayout";
import Home from "./pages/Home";
import Rooms from "./pages/Rooms";
import RoomDetails from "./pages/RoomDetails";

import "./styles/tokens.css";
import "./styles/global.css";

import Checkout from "./pages/Checkout.jsx";
import BookingAccess from "./pages/BookingAccess.jsx";
import MyBooking from "./pages/MyBooking.jsx";
import PaymentReturn from './pages/PaymentReturn.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:id" element={<RoomDetails />} />
          <Route
            path="/checkout/:roomTypeId"
            element={<Checkout />}
          />
          <Route path="/booking-access" element={<BookingAccess />} />
          <Route path="/payment-return" element={<PaymentReturn />} />
          <Route path="/my-booking" element={<MyBooking />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
