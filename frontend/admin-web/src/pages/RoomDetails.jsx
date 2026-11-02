import { Link, useParams } from "react-router";

import { useStaffData } from "../hooks/useStaffData";
import {
  getRoom,
  getRoomBlocks,
} from "../services/roomsApi";

import StaffDataState from "../components/StaffDataState";

import {
  formatStatus,
  formatStayDate,
  formatTimestamp,
} from "../utils/formatters";

export default function RoomDetails() {
  const { roomId } = useParams();

  const room = useStaffData(getRoom, roomId);
  const blocks = useStaffData(getRoomBlocks, roomId);

  function refresh() {
    room.reload();
    blocks.reload();
  }

  return (
    <section aria-labelledby="room-title">
      <Link to="/rooms">Return to rooms</Link>

      <div className="records-heading">
        <h1 id="room-title">Room details</h1>

        <button
          type="button"
          onClick={refresh}
          disabled={room.loading || blocks.loading}
        >
          Refresh room
        </button>
      </div>

      <StaffDataState
        state={room}
        label="Room details"
      />

      {room.status === "ready" && (
        <>
          <dl className="record-fields">
            <div>
              <dt>Room</dt>
              <dd>{room.data.roomNumber}</dd>
            </div>

            <div>
              <dt>Floor</dt>
              <dd>{room.data.floor || "Not recorded"}</dd>
            </div>

            <div>
              <dt>Room type</dt>
              <dd>{room.data.roomType.name}</dd>
            </div>

            <div>
              <dt>Guest capacity</dt>
              <dd>{room.data.roomType.capacity}</dd>
            </div>

            <div>
              <dt>Operational status</dt>
              <dd>{formatStatus(room.data.status)}</dd>
            </div>

            <div>
              <dt>Room active</dt>
              <dd>{room.data.isActive ? "Yes" : "No"}</dd>
            </div>

            <div>
              <dt>Room type active</dt>
              <dd>
                {room.data.roomType.isActive ? "Yes" : "No"}
              </dd>
            </div>
          </dl>

          <section
            className="record-section"
            aria-labelledby="blocks-title"
          >
            <h2 id="blocks-title">Dated block history</h2>

            <p>
              A block includes its start date and excludes
              its end date. Cancelled blocks remain in history.
            </p>

            <StaffDataState
              state={blocks}
              label="Room block history"
            />

            {blocks.status === "ready" && (
              blocks.data.length === 0 ? (
                <p role="status">
                  No dated blocks recorded for this room.
                </p>
              ) : (
                <div
                  className="records-scroll"
                  role="region"
                  aria-label="Room block history table"
                  tabIndex={0}
                >
                  <table className="records-table">
                    <caption>
                      Room blocks, earliest start date first
                    </caption>

                    <thead>
                      <tr>
                        <th scope="col">Start date</th>
                        <th scope="col">End date</th>
                        <th scope="col">Reason</th>
                        <th scope="col">Cancellation</th>
                        <th scope="col">Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {blocks.data.map((block) => (
                        <tr key={block.id}>
                          <td>
                            {formatStayDate(block.startDate)}
                          </td>

                          <td>
                            {formatStayDate(block.endDate)}
                          </td>

                          <td>{block.reason}</td>

                          <td>
                            {block.canceledAt
                              ? (
                                  "Cancelled " +
                                  formatTimestamp(
                                    block.canceledAt,
                                  )
                                )
                              : "Not cancelled"}
                          </td>

                          <td>
                            {formatTimestamp(block.createdAt)}
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
    </section>
  );
}