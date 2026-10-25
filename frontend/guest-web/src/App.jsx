
import { BrowserRouter, Routes, Route } from "react-router";

import Navbar from "./components/Navbar";
import BackendStatus from "./components/BackendStatus";
import Home from "./pages/Home";
import Rooms from "./pages/Rooms";

import "./styles/global.css";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <BackendStatus />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
      </Routes>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} NEXORA.
          All rights reserved.
        </p>
      </footer>
    </BrowserRouter>
  );
}

export default App;
