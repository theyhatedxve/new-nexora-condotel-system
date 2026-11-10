import useRoomsPage from "../hooks/useRoomsPage.js";
import { RoomsSearch } from "../components/rooms/RoomsSearch.jsx";
import "../styles/rooms-listing.css";
import "../styles/availability.css";

function Rooms() {
  const { metadata, search, parsed, clearInvalidSearch, applySearch, clearSearch } =
    useRoomsPage();

  return (
    <main className="rooms-page rooms-directory">
      <h1>Our Rooms</h1>

      <p className="rooms-intro">
        {status === "success"
          ? `${rooms.length} room ${rooms.length === 1 ? "type" : "types"} listed. `
          : ""}
        Rates shown are per night.
      </p>

      {parsed.error ? (
        <div className="guest-feedback" role="alert">
          <h2>Check your search</h2>

          <p>{parsed.error}</p>

          <button
            type="button"
            className="feedback-retry-button"
            onClick={clearInvalidSearch}
          >
            Clear invalid search
          </button>
        </div>
      ) : (
        <RoomsSearch
          key={search}
          query={parsed.query}
          search={search}
          metadata={metadata}
          onApply={applySearch}
          onClear={clearSearch}
        />
      )}
    </main>
  );
}
export default Rooms;
