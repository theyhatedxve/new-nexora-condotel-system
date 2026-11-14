import useRoomsPage from "../hooks/useRoomsPage.js";
import { RoomDirectory } from "../components/rooms/RoomDirectory.jsx";
import "../styles/rooms.css";

export default function Rooms() {
  const { queryKey, parsed, changePage, clearFilters, changeSearchParams } =
    useRoomsPage();

  return (
    <section className="rooms-screen" aria-labelledby="rooms-title">
      <header className="rooms-screen__heading">
        <h1 id="rooms-title">Rooms</h1>
        <p>Manage physical room inventory and operational status.</p>
      </header>

      <p className="rooms-screen__notice">
        Operational status describes a room’s current condition. Availability
        for a stay also depends on dates, reservations, assignments, and dated
        blocks.
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
