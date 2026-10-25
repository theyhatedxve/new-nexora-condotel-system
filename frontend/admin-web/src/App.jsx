
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router";

import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";

import "./styles/global.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route
            path="/reservations"
            element={<PlaceholderPage title="Reservations" />}
          />

          <Route
            path="/rooms"
            element={<PlaceholderPage title="Rooms" />}
          />

          <Route
            path="/guests"
            element={<PlaceholderPage title="Guests" />}
          />

          <Route
            path="/nfc"
            element={<PlaceholderPage title="NFC Management" />}
          />

          <Route
            path="/payments"
            element={<PlaceholderPage title="Payments" />}
          />

          <Route
            path="/reports"
            element={<PlaceholderPage title="Reports" />}
          />

          <Route
            path="/users"
            element={<PlaceholderPage title="User Management" />}
          />

          <Route
            path="/settings"
            element={<PlaceholderPage title="Settings" />}
          />

          <Route
            path="/audit-logs"
            element={<PlaceholderPage title="Audit Logs" />}
          />

          <Route
            path="*"
            element={<PlaceholderPage title="Page Not Found" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
