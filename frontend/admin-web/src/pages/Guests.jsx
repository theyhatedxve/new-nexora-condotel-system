import { Link } from "react-router";

import { useStaffData } from "../hooks/useStaffData";
import { listGuests } from "../services/guestsApi";
import StaffDataState from "../components/StaffDataState";
import { guestName } from "../utils/formatters";

export default function Guests() {
  const state = useStaffData(listGuests);

  return (
    <section aria-labelledby="guests-title">
      <div className="records-heading">
        <h1 id="guests-title">Guests</h1>

        <button
          type="button"
          onClick={state.reload}
          disabled={state.loading}
        >
          Refresh guests
        </button>
      </div>

      <StaffDataState
        state={state}
        label="Guests"
      />

      {state.status === "ready" && (
        <>
          <p>
            Showing {state.data.items.length} of{" "}
            {state.data.total} guests with reservations at
            this property. Most recently updated first;
            up to {state.data.limit} records.
          </p>

          {state.data.items.length === 0 ? (
            <p role="status">
              No guests with reservations found for this property.
            </p>
          ) : (
            <div
              className="records-scroll"
              role="region"
              aria-label="Guests table"
              tabIndex={0}
            >
              <table className="records-table records-table-compact">
                <caption>
                  Guests associated with this property
                </caption>

                <thead>
                  <tr>
                    <th scope="col">Guest</th>
                    <th scope="col">Reservations</th>
                  </tr>
                </thead>

                <tbody>
                  {state.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link
                          to={
                            "/guests/" +
                            encodeURIComponent(item.id)
                          }
                        >
                          {guestName(item)}
                        </Link>
                      </td>

                      <td>{item.reservationCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}