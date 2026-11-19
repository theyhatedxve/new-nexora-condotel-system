import { BedDouble, CreditCard } from "lucide-react";
import StaffDataState from "../StaffDataState";

import {
  formatPesos,
  formatStayDate,
  formatStatus,
  formatTimestamp,
} from "../../utils/formatters";

export default function ReservationOverview({
  booking,
  payment,
  summary,
  assignments,
}) {
  const financialReady =
    payment.status === "ready" && Boolean(summary);

  const currentAssignments =
    assignments.status === "ready"
      ? assignments.data.filter((item) => !item.releasedAt)
      : [];

  const needsAttention =
    booking.status === "PENDING" ||
    Boolean(booking.arrivalPolicy) ||
    (financialReady &&
      (
        summary.requiresReview ||
        summary.hasPendingPayment ||
        summary.pendingRefundCentavos > 0
      ));

  return (
    <>
      {needsAttention && (
        <section
          className="reservation-focus__attention"
          aria-labelledby="reservation-attention-title"
        >
          <h2 id="reservation-attention-title">
            Needs attention
          </h2>

          {booking.status === "PENDING" && (
            <>
              <p>
                This reservation is pending. Review the request and
                its confirmation requirements before preparing arrival.
              </p>

              <dl className="record-fields">
                <div>
                  <dt>Current confirmation deadline</dt>
                  <dd>
                    {booking.holdExpiresAt
                      ? formatTimestamp(booking.holdExpiresAt)
                      : "Not recorded — review the request"}
                  </dd>
                </div>

                {booking.responseDeadlineAt && (
                  <div>
                    <dt>Guest response deadline</dt>
                    <dd>
                      {formatTimestamp(booking.responseDeadlineAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </>
          )}

          {booking.arrivalPolicy && (
            <>
              <p>{booking.arrivalPolicy.text}</p>

              {booking.arrivalPolicy.deadlineAt && (
                <p>
                  Unpaid no-show cutoff:{" "}
                  <strong>
                    {formatTimestamp(booking.arrivalPolicy.deadlineAt)}
                  </strong>
                </p>
              )}
            </>
          )}

          {financialReady && summary.requiresReview && (
            <p role="alert">
              Payment records require financial review.
              Settlement amounts are unavailable.
            </p>
          )}

          {financialReady && summary.hasPendingPayment && (
            <p role="status">
              A payment attempt remains pending. Check its outcome
              before recording another collection.
            </p>
          )}

          {financialReady && summary.pendingRefundCentavos > 0 && (
            <p role="status">
              Refunds awaiting completion:{" "}
              {formatPesos(summary.pendingRefundCentavos)}.
            </p>
          )}
        </section>
      )}

      <div className="reservation-focus__overview">
        <section
          className="reservation-focus__card"
          aria-labelledby="reservation-stay-title"
        >
          <h2 id="reservation-stay-title">
            <BedDouble size={20} aria-hidden="true" />
            Stay overview
          </h2>

          <dl className="record-fields">
            <div>
              <dt>Room category</dt>
              <dd>{booking.roomType.name}</dd>
            </div>

            <div>
              <dt>Recorded arrival date</dt>
              <dd>{formatStayDate(booking.checkInDate)}</dd>
            </div>

            <div>
              <dt>Recorded departure date</dt>
              <dd>{formatStayDate(booking.checkOutDate)}</dd>
            </div>

            <div>
              <dt>Guests</dt>
              <dd>{booking.guestCount}</dd>
            </div>

            <div>
              <dt>Physical room</dt>
              <dd>
                {assignments.status !== "ready"
                  ? "Assignment records not loaded"
                  : currentAssignments.length === 1
                    ? currentAssignments[0].room.roomNumber
                    : currentAssignments.length > 1
                      ? "Multiple assignments — review required"
                      : "Not assigned"}
              </dd>
            </div>
          </dl>

          <p className="reservation-focus__muted">
            Times and deadlines use Philippine time. Open Stay
            Operations for current arrival and departure guidance.
          </p>
        </section>

        <section
          className="reservation-focus__card"
          aria-labelledby="reservation-payment-title"
        >
          <h2 id="reservation-payment-title">
            <CreditCard size={20} aria-hidden="true" />
            Accommodation payment
          </h2>

          <StaffDataState state={payment} label="Payment summary" />

          {financialReady && (
            <>
              <p className="reservation-focus__status-line">
                Payment status
                <span
                  className="reservation-details-screen__badge"
                  data-status={summary.status}
                >
                  {formatStatus(summary.status)}
                </span>
              </p>

              {summary.requiresReview ? (
                <p className="reservation-focus__muted">
                  Resolve financial review before relying on
                  settlement amounts.
                </p>
              ) : (
                <dl className="record-fields">
                  <div>
                    <dt>Booked total</dt>
                    <dd>
                      {formatPesos(summary.bookedTotalCentavos)}
                    </dd>
                  </div>

                  <div>
                    <dt>Net paid</dt>
                    <dd>{formatPesos(summary.netPaidCentavos)}</dd>
                  </div>

                  <div className="reservation-focus__balance">
                    <dt>Balance due</dt>
                    <dd>
                      {summary.balanceDueCentavos === null
                        ? "Not available"
                        : formatPesos(summary.balanceDueCentavos)}
                    </dd>
                  </div>
                </dl>
              )}
            </>
          )}

          <p className="reservation-focus__muted">
            Additional charges and security deposits have separate
            records. Reservation status and payment status are separate.
          </p>
        </section>
      </div>

      <details className="reservation-focus__accordion">
        <summary>Guest contact details</summary>
        <div className="reservation-focus__accordion-body">
          <dl className="record-fields">
            <div>
              <dt>Email</dt>
              <dd>{booking.guest.email || "Not provided"}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{booking.guest.phone || "Not provided"}</dd>
            </div>
          </dl>
        </div>
      </details>

      <details className="reservation-focus__accordion">
        <summary>Booked price and accommodation payment breakdown</summary>
        <div className="reservation-focus__accordion-body">
          <dl className="record-fields">
            <div>
              <dt>Stored nightly rate</dt>
              <dd>{formatPesos(booking.nightlyRateCentavos)}</dd>
            </div>
            <div>
              <dt>Original booked stay total</dt>
              <dd>{formatPesos(booking.totalAmountCentavos)}</dd>
            </div>
          </dl>

          {financialReady && !summary.requiresReview ? (
            <dl className="record-fields">
              <div>
                <dt>Verified or recorded collections</dt>
                <dd>{formatPesos(summary.collectedCentavos)}</dd>
              </div>
              <div>
                <dt>Completed refunds</dt>
                <dd>{formatPesos(summary.refundedCentavos)}</dd>
              </div>
            </dl>
          ) : (
            <p>
              Load a payment summary without financial-review
              restrictions to inspect settlement amounts.
            </p>
          )}
        </div>
      </details>
    </>
  );
}