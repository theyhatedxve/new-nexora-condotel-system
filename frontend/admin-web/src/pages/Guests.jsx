import useGuestsPage from "../hooks/useGuestsPage.js";
import { GuestFilters } from "../components/guests/GuestFilters.jsx";
import { GuestResults } from "../components/guests/GuestResults.jsx";
import "../styles/guests.css";

export default function Guests() {
  const { queryKey, parsed, changePage, clearFilters, changeSearchParams } =
    useGuestsPage();

  return (
    <section className="guests-screen" aria-labelledby="guests-title">
      <header className="guests-screen__heading">
        <h1 id="guests-title">Guests</h1>
        <p>Find guests with reservations at this property.</p>
      </header>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            className="guests-screen__secondary"
            onClick={clearFilters}
          >
            Clear invalid search
          </button>
        </div>
      ) : (
        <>
          <GuestFilters
            key={queryKey}
            query={parsed.query}
            onApply={changeSearchParams}
            onClear={clearFilters}
          />

          <GuestResults query={parsed.query} onPage={changePage} />
        </>
      )}
    </section>
  );
}
