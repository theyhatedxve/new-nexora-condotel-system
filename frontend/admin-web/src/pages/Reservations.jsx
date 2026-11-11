import useReservationsPage from "../hooks/useReservationsPage.js";
import { ReservationFilters } from "../components/reservations/ReservationFilters.jsx";
import { ReservationResults } from "../components/reservations/ReservationResults.jsx";

import "../styles/reservations.css";

export default function Reservations() {
  const { queryKey, parsed, changePage, clearFilters, changeSearchParams } =
    useReservationsPage();

  return (
    <section className="reservations-screen" aria-labelledby="reservations-title">
      <header className="reservations-screen__heading">
        <p className="eyebrow">Staff workspace</p>
        <h1 id="reservations-title">Reservations</h1>
        <p>Find reservations, review stay details, and open a booking to continue.</p>
      </header>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button type="button" onClick={clearFilters}>
            Clear invalid filters
          </button>
        </div>
      ) : (
        <>
          <ReservationFilters
            key={queryKey}
            query={parsed.query}
            onApply={changeSearchParams}
            onClear={clearFilters}
          />

          <ReservationResults query={parsed.query} onPage={changePage} />
        </>
      )}
    </section>
  );
}
