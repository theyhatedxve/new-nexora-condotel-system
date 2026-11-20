import { Navigate } from "react-router";

export default function BookingAccessRedirect() {
  return <Navigate to="/my-bookings" replace />;
}
