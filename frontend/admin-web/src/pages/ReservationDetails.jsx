import {
  Link,
  useLocation,
  useParams,
} from "react-router";

import { useStaffData } from "../hooks/useStaffData";

import {
  getReservation,
  getAssignmentHistory,
  getReservationPaymentSummary,
  parseReservationListQuery,
  reservationListSearch,
} from "../services/reservationsApi";

import StaffDataState from "../components/StaffDataState";

import {
  formatPesos,
  formatStayDate,
  formatStatus,
  formatTimestamp,
  guestName,
} from "../utils/formatters";

import ReservationActions from "../components/ReservationActions";

import PropertyCollection from "../components/PropertyCollection";




export default function ReservationDetails() {
  const { reservationId } = useParams();

  const location = useLocation();

    let returnSearch = "";

    const savedSearch =
      location.state?.reservationListSearch;

    if (
      typeof savedSearch === "string" &&
      savedSearch.length <= 2000
    ) {
      try {
        returnSearch = reservationListSearch(
          parseReservationListQuery(savedSearch),
        );
      } catch {
        returnSearch = "";
      }
    }

  const record = useStaffData(
    getReservation,
    reservationId,
  );

  const assignments = useStaffData(
    getAssignmentHistory,
    reservationId,
  );

  const payment = useStaffData(
    getReservationPaymentSummary,
    reservationId,
  );

  const booking = record.data;
  const summary = payment.data;

  function refresh() {
    record.reload();
    assignments.reload();
    payment.reload();
  }

  return (
    <section aria-labelledby="reservation-title">
      <Link
          to={{
            pathname: "/reservations",
            search: returnSearch ? "?" + returnSearch : "",
          }}
        >
          Return to reservations
        </Link>

      <div className="records-heading">
        <h1 id="reservation-title">
          Reservation details
        </h1>

        <button
          type="button"
          onClick={refresh}
          disabled={
            record.loading ||
            assignments.loading ||
            payment.loading
          }
        >
          Refresh details
        </button>
      </div>

      <StaffDataState
        state={record}
        label="Reservation details"
      />

      {record.status === "ready" && (
        <>
          <section className="content-card record-section">
            <h2>{booking.reservationNumber}</h2>

            <dl className="record-fields">
              <div>
                <dt>Reservation status</dt>
                <dd>{formatStatus(booking.status)}</dd>
              </div>

              <div>
                <dt>Room type</dt>
                <dd>{booking.roomType.name}</dd>
              </div>

              <div>
                <dt>Check-in date</dt>
                <dd>{formatStayDate(booking.checkInDate)}</dd>
              </div>

              <div>
                <dt>Check-out date</dt>
                <dd>{formatStayDate(booking.checkOutDate)}</dd>
              </div>

              <div>
                <dt>Guest count</dt>
                <dd>{booking.guestCount}</dd>
              </div>

              <div>
                <dt>Booked nightly rate</dt>
                <dd>{formatPesos(booking.nightlyRateCentavos)}</dd>
              </div>

              <div>
                <dt>Booked stay total</dt>
                <dd>{formatPesos(booking.totalAmountCentavos)}</dd>
              </div>

              <div>
                <dt>Created</dt>
                <dd>{formatTimestamp(booking.createdAt)}</dd>
              </div>

              {booking.status === "PENDING" && (
                <div>
                  <dt>Hold expires</dt>
                  <dd>{formatTimestamp(booking.holdExpiresAt)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="content-card record-section">
            <h2>Primary guest</h2>

            <p>
              <Link
                to={
                  "/guests/" +
                  encodeURIComponent(booking.guest.id)
                }
              >
                {guestName(booking.guest)}
              </Link>
            </p>

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
          </section>

          <section className="content-card record-section">
            <h2>Payment summary</h2>

            <StaffDataState
              state={payment}
              label="Payment summary"
            />

            {payment.status === "ready" && (
              <>
                <p>
                  Payment status:{" "}
                  <strong>
                    {formatStatus(summary.status)}
                  </strong>
                </p>

                {summary.requiresReview ? (
                  <p role="alert">
                    Payment records require financial review.
                    Settlement amounts are unavailable.
                  </p>
                ) : (
                  <dl className="record-fields">
                    <div>
                      <dt>Booked total</dt>
                      <dd>{formatPesos(summary.bookedTotalCentavos)}</dd>
                    </div>

                    <div>
                      <dt>Verified or recorded collections</dt>
                      <dd>{formatPesos(summary.collectedCentavos)}</dd>
                    </div>

                    <div>
                      <dt>Completed refunds</dt>
                      <dd>{formatPesos(summary.refundedCentavos)}</dd>
                    </div>

                    <div>
                      <dt>Net paid</dt>
                      <dd>{formatPesos(summary.netPaidCentavos)}</dd>
                    </div>

                    <div>
                      <dt>Balance due</dt>
                      <dd>{formatPesos(summary.balanceDueCentavos)}</dd>
                    </div>
                  </dl>
                )}

                {summary.hasPendingPayment && (
                  <p>
                    A payment attempt remains pending.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="record-section">
            <h2>Room assignment history</h2>

            <StaffDataState
              state={assignments}
              label="Assignment history"
            />

            {assignments.status === "ready" && (
              assignments.data.length === 0 ? (
                <p>No physical room has been assigned.</p>
              ) : (
                <div
                  className="records-scroll"
                  role="region"
                  aria-label="Room assignment history"
                  tabIndex={0}
                >
                  <table className="records-table">
                    <caption>
                      Current and historical room assignments
                    </caption>

                    <thead>
                      <tr>
                        <th scope="col">Room</th>
                        <th scope="col">Assigned</th>
                        <th scope="col">Released</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignments.data.map((item) => (
                        <tr key={item.id}>
                          <td>{item.room.roomNumber}</td>
                          <td>{formatTimestamp(item.assignedAt)}</td>
                          <td>
                            {item.releasedAt
                              ? formatTimestamp(item.releasedAt)
                              : "Current assignment"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </section>
                </>
      )}

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
