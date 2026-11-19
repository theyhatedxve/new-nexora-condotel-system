import { Info } from "lucide-react";

import useRoomsPage from "../hooks/useRoomsPage.js";
import { RoomDirectory } from "../components/RoomDirectory.jsx";

import "../styles/rooms.css";
import "../styles/room-workspace.css";

export default function Rooms() {
  const {
    queryKey,
    parsed,
    changePage,
    clearFilters,
    changeSearchParams,
  } = useRoomsPage();

  return (
    <section
      className="rooms-screen room-ui"
      aria-labelledby="rooms-title"
    >
      <header className="room-ui__toolbar">
        <div>
          <h1 id="rooms-title" className="room-ui__sr-only">
            Rooms
          </h1>

          <p className="room-ui__intro">
            Manage physical rooms, operational status, and inventory.
          </p>
        </div>
      </header>

      <p className="rooms-screen__notice room-ui__notice">
        <Info size={19} aria-hidden="true" />
        <span>
          Room status records the current physical condition. Stay availability
          also depends on dates, reservations, assignments, and dated blocks.
        </span>
      </p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            className="rooms-screen__secondary"
            onClick={clearFilters}
          >
            Clear invalid filters
          </button>
        </div>
      ) : (
        <RoomDirectory
          query={parsed.query}
          queryKey={queryKey}
          onApply={changeSearchParams}
          onClear={clearFilters}
          onPage={changePage}
        />
      )}
    </section>
  );
}