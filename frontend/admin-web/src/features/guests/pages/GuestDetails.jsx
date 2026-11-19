import { Link } from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";

import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import useGuestDetailsPage from "../hooks/useGuestDetailsPage.js";

import {
  formatStayDate,
  formatStatus,
  guestName,
} from "../../../shared/utils/formatters.js";

import "../styles/guest-workspace.css";

export default function GuestDetails() {
  const { returnSearch, state, guest } = useGuestDetailsPage();

  return (
    <section
      className="guest-details-screen guest-ui"
      aria-labelledby="guest-title"
    >
      <header className="guest-ui__toolbar">
        <Link
          className="guest-ui__back"
          to={{
            pathname: "/guests",
            search: returnSearch ? "?" + returnSearch : "",
          }}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Return to guests
        </Link>

        <button
          type="button"
          className="guest-ui__secondary"
          onClick={state.reload}
          disabled={state.loading}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {state.loading ? "Refreshing…" : "Refresh details"}
        </button>
      </header>

      <h1 id="guest-title" className="guest-ui__sr-only">
        Guest details
      </h1>

      <StaffDataState state={state} label="Guest details" />

      {state.status === "ready" && (
        <>
          <section
            className="guest-ui__identity"
            aria-labelledby="guest-name-title"
          >
            <span className="guest-ui__identity-icon">
              <UserRound size={30} aria-hidden="true" />
            </span>

            <div className="guest-ui__identity-text">
              <p className="guest-ui__eyebrow">Guest profile</p>
              <h2 id="guest-name-title">{guestName(guest)}</h2>
            </div>

            <span className="guest-ui__count-pill">
              <CalendarDays size={17} aria-hidden="true" />
              {guest.reservationCount.toLocaleString("en-PH")}{" "}
              {guest.reservationCount === 1
                ? "reservation"
                : "reservations"}
            </span>
          </section>

          <section
            className="guest-ui__card"
            aria-labelledby="guest-contact-title"
          >
            <h2 id="guest-contact-title">
              <UserRound size={21} aria-hidden="true" />
              Contact Information
            </h2>

            <dl className="guest-ui__contact-fields">
              <div>
                <dt>
                  <Mail size={16} aria-hidden="true" />
                  Email
                </dt>
                <dd>{guest.email || "Not provided"}</dd>
              </div>

              <div>
                <dt>
                  <Phone size={16} aria-hidden="true" />
                  Phone
                </dt>
                <dd>{guest.phone || "Not provided"}</dd>
              </div>
            </dl>
          </section>

          <section
            className="record-section"
            aria-labelledby="guest-history-title"
          >
            <header className="guest-ui__section-heading">
              <h2 id="guest-history-title">
                <CalendarDays size={21} aria-hidden="true" />
                Reservation History
              </h2>
            </header>

            <p className="guest-ui__summary" role="status">
              Showing {guest.reservations.length} of{" "}
              {guest.reservationCount} reservations. Most recently
              created first; up to {guest.historyLimit} records.
            </p>

            {guest.reservations.length === 0 ? (
              <p role="status">No reservations found.</p>
            ) : (
              <div
                className="records-scroll"
                role="region"
                aria-label="Guest reservation history"
                tabIndex={0}
              >
                <table className="records-table">
                  <caption>Reservations for this guest</caption>

                  <thead>
                    <tr>
                      <th scope="col">Booking Reference</th>
                      <th scope="col">Room Type</th>
                      <th scope="col">Check-in</th>
                      <th scope="col">Check-out</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {guest.reservations.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            to={
                              "/reservations/" +
                              encodeURIComponent(item.id)
                            }
                          >
                            {item.reservationNumber}
                          </Link>
                        </td>

                        <td>{item.roomType.name}</td>
                        <td>{formatStayDate(item.checkInDate)}</td>
                        <td>{formatStayDate(item.checkOutDate)}</td>

                        <td>
                          <span
                            className="guest-ui__badge"
                            data-status={item.status}
                          >
                            {formatStatus(item.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}