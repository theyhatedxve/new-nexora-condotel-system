import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import useReservationsPage from "../hooks/useReservationsPage.js";
import { ReservationFilters } from "../components/reservations/ReservationFilters.jsx";
import { ReservationResults } from "../components/reservations/ReservationResults.jsx";

import "../styles/reservations.css";
import "../styles/reservation-workspace.css";

export default function Reservations() {
  const {
    queryKey,
    parsed,
    changePage,
    clearFilters,
    changeSearchParams,
  } = useReservationsPage();

  return (
    <section
      className="reservations-screen reservation-ui"
      aria-labelledby="reservations-title"
    >
      <header className="reservation-ui__toolbar">
        <div>
          <h1
            id="reservations-title"
            className="reservation-ui__sr-only"
          >
            Reservations
          </h1>

          <p className="reservation-ui__intro">
            Search by booking reference, status, or check-in dates.
          </p>
        </div>

        <Link
          className="reservation-ui__outline-link"
          to="/rooms"
        >
          Rooms & Inventory
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </header>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            className="reservations-screen__secondary"
            onClick={clearFilters}
          >
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

          <ReservationResults
            query={parsed.query}
            onPage={changePage}
          />
        </>
      )}
    </section>
  );
}