import { History } from "lucide-react";
import StaffDataState from "../StaffDataState";
import { formatTimestamp } from "../../utils/formatters";

export default function ReservationHistory({ booking, assignments }) {
  return (
    <section className="reservation-details-screen__card record-section" aria-labelledby="reservation-history-title">
      <h2 id="reservation-history-title"><History size={19} aria-hidden="true" /> Recorded history</h2>
      <p className="reservation-details-screen__muted">
        Reservation creation and current or historical room assignments. Times use Philippine time.
      </p>

      <dl className="reservation-details-screen__created">
        <div>
          <dt>Reservation created</dt>
          <dd>{formatTimestamp(booking.createdAt)}</dd>
        </div>
      </dl>

      <h3>Room assignment history</h3>
      <StaffDataState state={assignments} label="Assignment history" />
      {assignments.status === "ready" && (
        assignments.data.length === 0 ? (
          <p>No physical room has been assigned.</p>
        ) : (
          <div className="records-scroll" role="region" aria-label="Room assignment history" tabIndex={0}>
            <table className="records-table">
              <caption>Current and historical room assignments</caption>
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
                    <td>{item.releasedAt ? formatTimestamp(item.releasedAt) : "Current assignment"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
