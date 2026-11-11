import { Link } from "react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import StaffDataState from "../components/StaffDataState";
import { formatStatus } from "../utils/formatters";
import ReservationOverview from "../components/reservations/ReservationOverview.jsx";
import ReservationHistory from "../components/reservations/ReservationHistory.jsx";
import ReservationActions from "../components/ReservationActions";
import PropertyCollection from "../components/PropertyCollection";
import GuestBookingStaffPanel from "../components/GuestBookingStaffPanel";
import useReservationDetailsPage from "../hooks/useReservationDetailsPage.js";

import "../styles/reservation-details.css";

export default function ReservationDetails() {
  const {
    reservationId,
    returnSearch,
    record,
    assignments,
    payment,
    booking,
    summary,
    refresh,
  } = useReservationDetailsPage();

  return (
    <section className="reservation-details-screen" aria-labelledby="reservation-title">
      <Link
        className="reservation-details-screen__back"
        to={{
          pathname: "/reservations",
          search: returnSearch ? "?" + returnSearch : "",
        }}
      >
        <ArrowLeft size={17} aria-hidden="true" />
        Return to reservations
      </Link>

      <header className="reservation-details-screen__heading">
        <div>
          <p className="eyebrow">Staff workspace</p>
          <h1 id="reservation-title">Reservation details</h1>
          <p className="reservation-details-screen__muted">
            Review the guest, stay, payment, and available staff actions.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={refresh}
          disabled={record.loading || assignments.loading || payment.loading}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Refresh details
        </button>
      </header>

      <StaffDataState state={record} label="Reservation details" />

      {record.status === "ready" && (
        <>
          <div className="reservation-details-screen__identity">
            <div>
              <p className="eyebrow">Booking reference</p>
              <p className="reservation-details-screen__reference">{booking.reservationNumber}</p>
              <p>
                Reservation status:{" "}
                <span className="reservation-details-screen__badge" data-status={booking.status}>
                  {formatStatus(booking.status)}
                </span>
              </p>
            </div>
            <button
              type="button"
              className="reservation-details-screen__manage"
              onClick={() => document.getElementById("reservation-actions-title")?.focus()}
            >
              Manage reservation
            </button>
          </div>

          <ReservationOverview booking={booking} payment={payment} summary={summary} />
          <ReservationHistory booking={booking} assignments={assignments} />
        </>
      )}

      <GuestBookingStaffPanel
        key={"guest-request-" + reservationId}
        record={record}
        payment={payment}
        onReload={refresh}
      />

      <ReservationActions
        key={reservationId}
        reservationId={reservationId}
        record={record}
        assignments={assignments}
        payment={payment}
        onReload={refresh}
      />

      <PropertyCollection
        key={"collection-" + reservationId}
        reservationId={reservationId}
        record={record}
        payment={payment}
        onReload={refresh}
      />
    </section>
  );
}
