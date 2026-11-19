import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";

import { useAuth } from "../../auth/useAuth.js";
import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import ReservationOverview from "../components/ReservationOverview.jsx";
import ReservationHistory from "../components/ReservationHistory.jsx";
import ReservationActionDialog from "../components/ReservationActionDialog.jsx";

import ReservationActions from "../components/ReservationActions.jsx";
import PropertyCollection from "../../payments/components/PropertyCollection.jsx";
import GuestBookingStaffPanel from "../components/GuestBookingStaffPanel.jsx";
import ReservationDeposits from "../components/ReservationDeposits.jsx";
import ReservationCharges from "../components/ReservationCharges.jsx";
import StayOperations from "../components/StayOperations.jsx";
import ReservationContacts from "../components/ReservationContacts.jsx";

import useReservationDetailsPage from "../hooks/useReservationDetailsPage.js";
import { staffRoles } from "../constants/guestBookingStaffPanel.js";
import { formatStatus, guestName } from "../../../shared/utils/formatters.js";

import "../styles/reservation-details.css";
import "../styles/reservation-workspace.css";
import "../styles/reservation-focus.css";

const GROUPS = [
  {
    number: "01",
    title: "Review and prepare arrival",
    description: "Review the request, prepare the room, and record money received.",
    actions: [
      {
        id: "reservation",
        title: "Reservation Actions",
        description: "Guest agreement, room assignment, check-in/out, and cancellation.",
      },
      {
        id: "collection",
        title: "Record Payment",
        description: "Record Pay at Property money already received.",
      },
      {
        id: "deposit",
        title: "Security Deposit",
        description: "Optional held funds, deductions, and cash returns.",
      },
    ],
  },
  {
    number: "02",
    title: "Manage the stay and departure",
    description: "Check departure guidance and handle separate stay charges.",
    actions: [
      {
        id: "stay",
        title: "Stay Operations",
        description: "Arrival, departure, grace periods, and extension guidance.",
      },
      {
        id: "charges",
        title: "Additional Charges",
        description: "Record, review, approve, and settle eligible charges.",
      },
    ],
  },
  {
    number: "03",
    title: "Guest communication",
    description: "Review completed contacts and record factual follow-ups.",
    actions: [
      {
        id: "contacts",
        title: "Guest Contact History",
        description: "Contact attempts, outcomes, notes, and arrival estimates.",
      },
    ],
  },
];

function ReservationWorkspace({ canManage }) {
  const data = useReservationDetailsPage();
  const {
    reservationId,
    returnSearch,
    record,
    assignments,
    payment,
    booking,
    summary,
    refresh,
  } = data;

  const [lastBooking, setLastBooking] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [visited, setVisited] = useState(() => new Set());
  const [opener, setOpener] = useState(null);

  const ready = record.status === "ready";
  const refreshing =
    record.loading || assignments.loading || payment.loading;

  // Keep dialog workspaces stable while refreshed records are loading.
  // Current record/payment readiness still controls action eligibility.
  if (ready && lastBooking !== booking) {
    setLastBooking(booking);
  }

  const dialogBooking = ready ? booking : lastBooking;

  function openDialog(event, id) {
    if (!ready || refreshing || !canManage || dialog) return;

    setOpener(event.currentTarget);
    setVisited((current) => new Set([...current, id]));
    setDialog(id);
  }

  function actionButton(action) {
    return (
      <button
        key={action.id}
        type="button"
        className="reservation-focus__action"
        data-primary={action.id === "reservation"}
        aria-haspopup="dialog"
        aria-controls={`reservation-dialog-${action.id}`}
        disabled={!ready || refreshing || !canManage}
        onClick={(event) => openDialog(event, action.id)}
      >
        <span>
          <strong>{action.title}</strong>
          <span>{action.description}</span>
        </span>
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    );
  }

  function renderDialog(id, title, children) {
    return (
      <ReservationActionDialog
        id={`reservation-dialog-${id}`}
        title={title}
        reference={dialogBooking?.reservationNumber || reservationId}
        active={dialog === id}
        visited={visited.has(id)}
        returnFocus={opener}
        onRequestClose={() => setDialog(null)}
      >
        {children}
      </ReservationActionDialog>
    );
  }

  return (
    <section
      className="reservation-details-screen reservation-ui reservation-focus"
      aria-labelledby="reservation-title"
    >
      <header className="reservation-ui__toolbar">
        <Link
          className="reservation-details-screen__back"
          to={{
            pathname: "/reservations",
            search: returnSearch ? `?${returnSearch}` : "",
          }}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Return to reservations
        </Link>

        <button
          type="button"
          className="secondary-button"
          onClick={refresh}
          disabled={refreshing || Boolean(dialog)}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {refreshing ? "Refreshing…" : "Refresh details"}
        </button>
      </header>

      <StaffDataState state={record} label="Reservation details" />

      {ready ? (
        <>
          <header className="reservation-focus__identity">
            <div>
              <p className="reservation-focus__eyebrow">
                Reservation details
              </p>

              <h1 id="reservation-title">
                {guestName(booking.guest)}
              </h1>

              <p className="reservation-focus__subtitle">
                {booking.roomType.name} · {booking.guestCount}{" "}
                {booking.guestCount === 1 ? "guest" : "guests"}
              </p>

              <p className="reservation-focus__reference">
                {booking.reservationNumber}
              </p>

              <Link
                className="reservation-focus__guest-link"
                to={`/guests/${encodeURIComponent(booking.guest.id)}`}
              >
                View guest profile
              </Link>
            </div>

            <div className="reservation-focus__status-block">
              <span>Reservation status</span>
              <span
                className="reservation-details-screen__badge"
                data-status={booking.status}
              >
                {formatStatus(booking.status)}
              </span>
            </div>
          </header>

          <ReservationOverview
            booking={booking}
            payment={payment}
            summary={summary}
            assignments={assignments}
          />

          <section
            className="reservation-focus__operations"
            aria-labelledby="reservation-workflow-title"
          >
            <header>
              <h2 id="reservation-workflow-title">
                Reservation workspace
              </h2>
              <p className="reservation-focus__muted">
                Follow the workflow below. Each button opens a focused
                dialog. Available controls depend on your role and
                the latest reservation and financial records.
              </p>
            </header>

            {!canManage && (
              <p role="status">
                This account can review the visible record but cannot
                open these staff workspaces.
              </p>
            )}

            <div className="reservation-focus__groups">
              {GROUPS.map((group) => (
                <section
                  key={group.number}
                  className="reservation-focus__group"
                  aria-labelledby={`workflow-${group.number}`}
                >
                  <span
                    className="reservation-focus__step"
                    aria-hidden="true"
                  >
                    {group.number}
                  </span>

                  <h3 id={`workflow-${group.number}`}>
                    {group.title}
                  </h3>

                  <p>{group.description}</p>

                  <div className="reservation-focus__buttons">
                    {group.actions.map(actionButton)}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <details className="reservation-focus__accordion">
            <summary>Reservation and room-assignment history</summary>
            <div className="reservation-focus__accordion-body">
              <ReservationHistory
                booking={booking}
                assignments={assignments}
              />
            </div>
          </details>
        </>
      ) : (
        <h1 id="reservation-title" className="reservation-ui__sr-only">
          Reservation details
        </h1>
      )}

      {renderDialog(
        "reservation",
        "Reservation Actions",
        <>
          <GuestBookingStaffPanel
            record={record}
            payment={payment}
            onReload={refresh}
          />

          <ReservationActions
            reservationId={reservationId}
            record={record}
            assignments={assignments}
            payment={payment}
            onReload={refresh}
          />
        </>,
      )}

      {renderDialog(
        "collection",
        "Record Pay at Property Payment",
        <PropertyCollection
          reservationId={reservationId}
          record={record}
          payment={payment}
          onReload={refresh}
        />,
      )}

      {renderDialog(
        "deposit",
        "Optional Security Deposit",
        <ReservationDeposits
          reservationId={reservationId}
          bookingStatus={dialogBooking?.status}
          onReload={refresh}
        />,
      )}

      {renderDialog(
        "stay",
        "Stay Operations",
        <StayOperations
          reservationId={reservationId}
          bookingStatus={dialogBooking?.status}
        />,
      )}

      {renderDialog(
        "charges",
        "Additional Charges",
        <ReservationCharges
          reservationId={reservationId}
          bookingStatus={dialogBooking?.status}
          onReload={refresh}
        />,
      )}

      {renderDialog(
        "contacts",
        "Guest Contact History",
        <ReservationContacts
          reservationId={reservationId}
          bookingStatus={dialogBooking?.status}
        />,
      )}
    </section>
  );
}

export default function ReservationDetails() {
  const { reservationId } = useParams();
  const { status, user } = useAuth();

  return (
    <ReservationWorkspace
      key={`${user?.id || "anonymous"}:${reservationId}`}
      canManage={
        status === "authenticated" &&
        staffRoles.includes(user?.role)
      }
    />
  );
}