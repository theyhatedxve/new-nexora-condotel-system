import useRoomsPage from "../hooks/useRoomsPage.js";
import { RoomsSearch } from "../components/rooms/RoomsSearch.jsx";
import "../styles/rooms-listing.css";
import "../styles/availability.css";
import "../styles/rooms-luxury.css";

function Rooms() {
  const { metadata, search, parsed, clearInvalidSearch, applySearch, clearSearch } =
    useRoomsPage();

  return (
    <main className="rooms-page rooms-directory rooms-luxury">
      <h1>Our Rooms</h1>

      <p className="rooms-intro">
        {metadata.status === "success"
          ? `${metadata.rooms.length} room ${metadata.rooms.length === 1 ? "type" : "types"} listed. `
          : ""}
        Choose a rental type to check availability and the full stay price.
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
