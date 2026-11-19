import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "../features/auth/AuthProvider.jsx";
import StaffRoute from "../features/auth/StaffRoute.jsx";
import { staffNavigation } from "./staffNavigation.js";
import AdminLayout from "./layouts/AdminLayout.jsx";
import Login from "../features/auth/pages/Login.jsx";
import Dashboard from "../features/dashboard/pages/Dashboard.jsx";
import Reservations from "../features/reservations/pages/Reservations.jsx";
import ReservationDetails from "../features/reservations/pages/ReservationDetails.jsx";
import Guests from "../features/guests/pages/Guests.jsx";
import GuestDetails from "../features/guests/pages/GuestDetails.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";
import Rooms from "../features/rooms/pages/Rooms.jsx";
import RoomDetails from "../features/rooms/pages/RoomDetails.jsx";
import Payments from "../features/payments/pages/Payments.jsx";
import PaymentDetails from "../features/payments/pages/PaymentDetails.jsx";
import RoomTypes from "../features/rooms/pages/RoomTypes.jsx";
import PaymentReconciliation from "../features/payments/pages/PaymentReconciliation.jsx";
import Reports from "../features/reports/pages/Reports.jsx";
import AuditLogs from "../features/audit/pages/AuditLogs.jsx";
import Settings from "../features/settings/pages/Settings.jsx";
import Users from "../features/users/pages/Users.jsx";
import StaffUserEditor from "../features/users/pages/StaffUserEditor.jsx";
import StaffPassword from "../features/auth/pages/StaffPassword.jsx";
import GuestAccounts from "../features/guests/pages/GuestAccounts.jsx";
import "../shared/styles/tokens.css";
import "../shared/styles/global.css";

const pages = {
  "/": <Dashboard />,
  "/reservations": <Reservations />,
  "/guests": <Guests />,
  "/rooms": <Rooms />,
  "/payments": <Payments />,
  "/reports": <Reports />,
  "/audit-logs": <AuditLogs />,
  "/settings": <Settings />,
  "/users": <Users />,
  "/guest-accounts": <GuestAccounts />,
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/staff/setup-password"
            element={<StaffPassword key="invitation" mode="invitation" />}
          />

          <Route
            path="/staff/change-temporary-password"
            element={<StaffPassword key="temporary" mode="temporary" />}
          />

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

              <Route element={<StaffRoute roles={["SUPER_ADMIN", "ADMIN"]} />}>
                <Route
                  path="/users/new"
                  element={<StaffUserEditor key="new" />}
                />
                <Route
                  path="/users/:userId"
                  element={<StaffUserEditor key="existing" />}
                />
              </Route>

              <Route
                path="/reservations/:reservationId"
                element={<ReservationDetails />}
              />

              <Route path="/rooms/:roomId" element={<RoomDetails />} />

              <Route element={<StaffRoute roles={["SUPER_ADMIN", "ADMIN", "MANAGER"]} />}>
                <Route path="/rooms/types" element={<RoomTypes />} />
              </Route>

              <Route element={<StaffRoute roles={["SUPER_ADMIN"]} />}>
                <Route
                  path="/payments/reconciliation"
                  element={<PaymentReconciliation />}
                />
              </Route>

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
