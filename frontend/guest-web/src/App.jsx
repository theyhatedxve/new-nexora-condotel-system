import { BrowserRouter, Routes, Route } from "react-router";

import GuestLayout from "./layouts/GuestLayout";
import Home from "./pages/Home";
import Rooms from "./pages/Rooms";
import RoomDetails from "./pages/RoomDetails";

import "./styles/tokens.css";
import "./styles/global.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:id" element={<RoomDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;