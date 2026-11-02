import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router";

import { AuthProvider } from "./auth/AuthProvider";
import StaffRoute from "./auth/StaffRoute";
import { staffNavigation } from "./auth/staffNavigation";

import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";

import "./styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={<Login />}
          />

          <Route element={<StaffRoute />}>
            <Route element={<AdminLayout />}>
              {staffNavigation.map((item) => (
                <Route
                  key={item.path}
                  element={
                    <StaffRoute roles={item.roles} />
                  }
                >
                  <Route
                    path={item.path}
                    element={
                      item.path === "/" ? (
                        <Dashboard />
                      ) : (
                        <PlaceholderPage
                          title={item.label}
                        />
                      )
                    }
                  />
                </Route>
              ))}

              <Route
                path="*"
                element={
                  <PlaceholderPage title="Page not found" />
                }
              />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}