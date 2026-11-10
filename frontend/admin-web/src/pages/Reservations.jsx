import useReservationsPage from "../hooks/useReservationsPage.js";
import { ReservationFilters } from "../components/reservations/ReservationFilters.jsx";
import { ReservationResults } from "../components/reservations/ReservationResults.jsx";

export default function Reservations() {
  const { queryKey, parsed, changePage, clearFilters, changeSearchParams } =
    useReservationsPage();

  return (
    <section aria-labelledby="reservations-title">
      <h1 id="reservations-title">Reservations</h1>

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
