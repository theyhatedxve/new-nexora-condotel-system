import { Link } from "react-router";
import { BedDouble, CreditCard, UserRound } from "lucide-react";
import StaffDataState from "../StaffDataState";
import {
  formatPesos,
  formatStayDate,
  formatStatus,
  formatTimestamp,
  guestName,
} from "../../utils/formatters";

export default function ReservationOverview({ booking, payment, summary }) {
  return (
    <div className="reservation-details-screen__overview">
      <section className="reservation-details-screen__card" aria-labelledby="reservation-guest-title">
        <h2 id="reservation-guest-title"><UserRound size={19} aria-hidden="true" /> Primary guest</h2>
        <p className="reservation-details-screen__guest">
          <Link to={"/guests/" + encodeURIComponent(booking.guest.id)}>
            {guestName(booking.guest)}
          </Link>
        </p>
        <dl className="record-fields">
          <div><dt>Email</dt><dd>{booking.guest.email || "Not provided"}</dd></div>
          <div><dt>Phone</dt><dd>{booking.guest.phone || "Not provided"}</dd></div>
        </dl>
      </section>

      <section className="reservation-details-screen__card" aria-labelledby="reservation-stay-title">
        <h2 id="reservation-stay-title"><BedDouble size={19} aria-hidden="true" /> Stay details</h2>
        <dl className="record-fields">
          <div><dt>Room type</dt><dd>{booking.roomType.name}</dd></div>
          <div><dt>Check-in date</dt><dd>{formatStayDate(booking.checkInDate)}</dd></div>
          <div><dt>Check-out date</dt><dd>{formatStayDate(booking.checkOutDate)}</dd></div>
          <div><dt>Guest count</dt><dd>{booking.guestCount}</dd></div>
          <div><dt>Booked nightly rate</dt><dd>{formatPesos(booking.nightlyRateCentavos)}</dd></div>
          <div><dt>Booked stay total</dt><dd>{formatPesos(booking.totalAmountCentavos)}</dd></div>
          {booking.status === "PENDING" && (
            <div><dt>Hold expires</dt><dd>{formatTimestamp(booking.holdExpiresAt)}</dd></div>
          )}
        </dl>
      </section>

      <section className="reservation-details-screen__card" aria-labelledby="reservation-payment-title">
        <h2 id="reservation-payment-title"><CreditCard size={19} aria-hidden="true" /> Payment summary</h2>
        <StaffDataState state={payment} label="Payment summary" />
        {payment.status === "ready" && (
          <>
            <p>
              Payment status:{" "}
              <span className="reservation-details-screen__badge" data-status={summary.status}>
                {formatStatus(summary.status)}
              </span>
            </p>
            {summary.requiresReview ? (
              <p role="alert" className="reservation-details-screen__notice">
                Payment records require financial review. Settlement amounts are unavailable.
              </p>
            ) : (
              <dl className="record-fields">
                <div><dt>Booked total</dt><dd>{formatPesos(summary.bookedTotalCentavos)}</dd></div>
                <div><dt>Verified or recorded collections</dt><dd>{formatPesos(summary.collectedCentavos)}</dd></div>
                <div><dt>Completed refunds</dt><dd>{formatPesos(summary.refundedCentavos)}</dd></div>
                <div><dt>Net paid</dt><dd>{formatPesos(summary.netPaidCentavos)}</dd></div>
                <div><dt>Balance due</dt><dd>{formatPesos(summary.balanceDueCentavos)}</dd></div>
              </dl>
            )}
            {summary.hasPendingPayment && (
              <p className="reservation-details-screen__notice">A payment attempt remains pending.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
