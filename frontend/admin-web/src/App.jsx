import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import StaffRoute from "./auth/StaffRoute";
import { staffNavigation } from "./auth/staffNavigation";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/Reservations";
import ReservationDetails from "./pages/ReservationDetails";
import Guests from "./pages/Guests";
import GuestDetails from "./pages/GuestDetails";
import PlaceholderPage from "./pages/PlaceholderPage";
import Rooms from "./pages/Rooms";
import RoomDetails from "./pages/RoomDetails";
import Payments from "./pages/Payments";
import PaymentDetails from "./pages/PaymentDetails";
import RoomTypes from "./pages/RoomTypes";
import PaymentReconciliation from "./pages/PaymentReconciliation";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import "./styles/tokens.css";
import "./styles/global.css";

const pages = {
  "/": <Dashboard />,
  "/reservations": <Reservations />,
  "/guests": <Guests />,
  "/rooms": <Rooms />,
  "/payments": <Payments />,
  "/reports": <Reports />,
  "/audit-logs": <AuditLogs />,
  "/settings": <Settings />,
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<StaffRoute />}>
            <Route element={<AdminLayout />}>
              {staffNavigation.map((item) => (
                <Route key={item.path} element={<StaffRoute roles={item.roles} />}>
                  <Route
                    path={item.path}
                    element={pages[item.path] ?? <PlaceholderPage title={item.label} />}
                  />
                </Route>
              ))}

              <Route
                path="/reservations/:reservationId"
                element={<ReservationDetails />}
              />

              <Route path="/rooms/:roomId" element={<RoomDetails />} />

              <Route element={<StaffRoute roles={["ADMIN", "MANAGER"]} />}>
                <Route path="/rooms/types" element={<RoomTypes />} />
              </Route>

              <Route
                path="/payments/reconciliation"
                element={<PaymentReconciliation />}
              />

              <Route path="/payments/:paymentId" element={<PaymentDetails />} />

              <Route path="/guests/:guestId" element={<GuestDetails />} />

              <Route path="*" element={<PlaceholderPage title="Page not found" />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
