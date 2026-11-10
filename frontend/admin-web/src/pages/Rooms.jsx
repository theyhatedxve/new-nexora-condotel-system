import useRoomsPage from "../hooks/useRoomsPage.js";
import { RoomDirectory } from "../components/rooms/RoomDirectory.jsx";

export default function Rooms() {
  const { queryKey, parsed, changePage, clearFilters, changeSearchParams } =
    useRoomsPage();

  return (
    <section aria-labelledby="rooms-title">
      <h1 id="rooms-title">Rooms</h1>

      <p>
        Current operational status is shown below. Stay availability also depends on
        dates, reservations, assignments, and dated blocks.
      </p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button type="button" onClick={clearFilters}>
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
