import { Link } from "react-router";
import {
  ArrowDown,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import StaffDataState from "../components/StaffDataState";
import ReservationOverview from "../components/reservations/ReservationOverview.jsx";
import ReservationHistory from "../components/reservations/ReservationHistory.jsx";
import ReservationActions from "../components/ReservationActions";
import PropertyCollection from "../components/PropertyCollection";
import GuestBookingStaffPanel from "../components/GuestBookingStaffPanel";
import ReservationDeposits from "../components/reservations/ReservationDeposits.jsx";
import ReservationCharges from "../components/reservations/ReservationCharges.jsx";
import StayOperations from "../components/reservations/StayOperations.jsx";
import ReservationContacts from "../components/reservations/ReservationContacts.jsx";

import useReservationDetailsPage from "../hooks/useReservationDetailsPage.js";
import { formatStatus } from "../utils/formatters";

import "../styles/reservation-details.css";
import "../styles/reservation-workspace.css";

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

  const ready = record.status === "ready";
  const refreshing =
    record.loading ||
    assignments.loading ||
    payment.loading;

  return (
    <section
      className="reservation-details-screen reservation-ui"
      aria-labelledby="reservation-title"
    >
      <header className="reservation-ui__toolbar">
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

        <button
          type="button"
          className="secondary-button"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {refreshing ? "Refreshing…" : "Refresh details"}
        </button>
      </header>

      <h1
        id="reservation-title"
        className="reservation-ui__sr-only"
      >
        Reservation details
      </h1>

      <StaffDataState
        state={record}
        label="Reservation details"
      />

      {ready && (
        <>
          <div className="reservation-details-screen__identity">
            <div>
              <p className="eyebrow">Booking reference</p>

              <p className="reservation-details-screen__reference">
                {booking.reservationNumber}
              </p>

              <p className="reservation-ui__status-line">
                Reservation status
                <span
                  className="reservation-details-screen__badge"
                  data-status={booking.status}
                >
                  {formatStatus(booking.status)}
                </span>
              </p>
            </div>

            <a
              className="reservation-details-screen__manage"
              href="#reservation-actions-title"
            >
              Manage reservation
              <ArrowDown size={17} aria-hidden="true" />
            </a>
          </div>

          <nav
            className="reservation-ui__section-nav"
            aria-label="Reservation details sections"
          >
            <a href="#reservation-overview">Overview</a>
            <a href="#reservation-management">Staff Actions</a>
            <a href="#reservation-stay-finance">Stay & Charges</a>
            <a href="#reservation-contact-history">
              Contacts & History
            </a>
          </nav>

          <div
            id="reservation-overview"
            className="reservation-ui__section"
            role="region"
            aria-label="Reservation overview"
            tabIndex={-1}
          >
            <ReservationOverview
              booking={booking}
              payment={payment}
              summary={summary}
            />
          </div>
        </>
      )}

      <div
        id="reservation-management"
        className="reservation-ui__section"
        role="region"
        aria-labelledby="reservation-management-title"
        tabIndex={-1}
        hidden={!ready}
      >
        <p
          id="reservation-management-title"
          className="reservation-ui__section-label"
        >
          Staff Actions
        </p>

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
      </div>

      {ready && (
        <>
          <div
            id="reservation-stay-finance"
            className="reservation-ui__section"
            role="region"
            aria-labelledby="reservation-stay-finance-title"
            tabIndex={-1}
          >
            <p
              id="reservation-stay-finance-title"
              className="reservation-ui__section-label"
            >
              Stay & Charges
            </p>

            <StayOperations
              reservationId={reservationId}
              bookingStatus={booking.status}
            />

            <ReservationCharges
              reservationId={reservationId}
              bookingStatus={booking.status}
              onReload={refresh}
            />

            <ReservationDeposits
              reservationId={reservationId}
              bookingStatus={booking.status}
              onReload={refresh}
            />
          </div>

          <div
            id="reservation-contact-history"
            className="reservation-ui__section"
            role="region"
            aria-labelledby="reservation-contact-history-title"
            tabIndex={-1}
          >
            <p
              id="reservation-contact-history-title"
              className="reservation-ui__section-label"
            >
              Contacts & History
            </p>

            <ReservationContacts
              reservationId={reservationId}
              bookingStatus={booking.status}
            />

            <ReservationHistory
              booking={booking}
              assignments={assignments}
            />
          </div>
        </>
      )}
    </section>
  );
}