import { RESERVATION_LIST_STATUSES } from "../../services/reservationsApi";
import { formatStatus } from "../../utils/formatters";
import useReservationFilters from "../../hooks/useReservationFilters.js";

export function ReservationFilters({ query, onApply, onClear }) {
  const {
    draft,
    error,
    submit,
    changeQ,
    changeStatus,
    changeCheckInFrom,
    changeCheckInTo,
    changeLimit,
  } = useReservationFilters({ query, onApply });

  return (
    <form className="reservation-filters" onSubmit={submit}>
      {error && <p role="alert">{error}</p>}

      <fieldset className="reservation-filter-fields">
        <legend>Filter reservations</legend>

        <div>
          <label htmlFor="reservation-reference-filter">Booking reference</label>
          <input
            id="reservation-reference-filter"
            type="search"
            maxLength={100}
            value={draft.q}
            onChange={changeQ}
          />
        </div>

        <div>
          <label htmlFor="reservation-status-filter">Reservation status</label>
          <select
            id="reservation-status-filter"
            value={draft.status}
            onChange={changeStatus}
          >
            <option value="">All statuses</option>

            {RESERVATION_LIST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="reservation-check-in-from">Check-in from</label>
          <input
            id="reservation-check-in-from"
            type="date"
            value={draft.checkInFrom}
            onChange={changeCheckInFrom}
          />
        </div>

        <div>
          <label htmlFor="reservation-check-in-to">Check-in through</label>
          <input
            id="reservation-check-in-to"
            type="date"
            value={draft.checkInTo}
            onChange={changeCheckInTo}
          />
        </div>

        <div>
          <label htmlFor="reservation-page-size">Records per page</label>
          <select id="reservation-page-size" value={draft.limit} onChange={changeLimit}>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <p className="reservation-filter-help">
          Both selected check-in dates are included. Apply filters to update the results.
        </p>

        <div className="actions reservation-filter-actions">
          <button type="submit">Apply filters</button>

          <button type="button" onClick={onClear}>
            Clear filters
          </button>
        </div>
      </fieldset>
    </form>
  );
}
