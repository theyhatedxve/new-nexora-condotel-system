import useGuestsPage from "../hooks/useGuestsPage.js";
import { GuestFilters } from "../components/guests/GuestFilters.jsx";
import { GuestResults } from "../components/guests/GuestResults.jsx";

export default function Guests() {
  const { queryKey, parsed, changePage, clearFilters, changeSearchParams } =
    useGuestsPage();

  return (
    <section aria-labelledby="guests-title">
      <h1 id="guests-title">Guests</h1>

      <p>Guests with reservations at this property.</p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button type="button" onClick={clearFilters}>
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
