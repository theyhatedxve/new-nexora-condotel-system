import { Link } from "react-router";
import {
  ArrowLeft,
  BedDouble,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

import HousekeepingPanel from "../components/HousekeepingPanel.jsx";
import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import RoomManagement from "../components/RoomManagement.jsx";
import useRoomDetailsPage from "../hooks/useRoomDetailsPage.js";

import {
  formatStatus,
  formatStayDate,
  formatTimestamp,
} from "../../../shared/utils/formatters.js";

import "../styles/room-workspace.css";
import "../styles/room-details-focus.css";

export default function RoomDetails() {
  const {
    roomId,
    returnSearch,
    room,
    blocks,
    canManage,
    refresh,
  } = useRoomDetailsPage();

  const ready = room.status === "ready";
  const refreshing = room.loading || blocks.loading;
  const current = ready ? room.data : null;

  return (
    <section
      className="room-details-screen room-ui room-focus"
      aria-labelledby="room-title"
    >
      <header className="room-ui__toolbar">
        <Link
          className="room-ui__back"
          to={{
            pathname: "/rooms",
            search: returnSearch ? "?" + returnSearch : "",
          }}
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Return to rooms
        </Link>

        <button
          type="button"
          className="room-ui__secondary"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {refreshing ? "Refreshing..." : "Refresh room"}
        </button>
      </header>

      <h1 id="room-title" className="room-ui__sr-only">
        Room details
      </h1>

      <StaffDataState state={room} label="Room details" />

      {current && (
        <>
          <section
            className="room-ui__identity"
            aria-labelledby="room-identity-title"
          >
            <span className="room-ui__identity-icon">
              <BedDouble size={28} aria-hidden="true" />
            </span>

            <div className="room-ui__identity-text">
              <p className="room-ui__eyebrow">Physical room</p>

              <h2 id="room-identity-title">
                Room {current.roomNumber}
              </h2>

              <p>
                {current.roomType.name} · Up to{" "}
                {current.roomType.capacity}{" "}
                {current.roomType.capacity === 1 ? "guest" : "guests"}
              </p>
            </div>

            <span
              className="room-ui__badge"
              data-status={current.status}
            >
              {formatStatus(current.status)}
            </span>
          </section>

          <div className="room-focus__guidance">
            <span>Ready does not guarantee availability.</span>

            <details className="room-focus__help">
              <summary>Why?</summary>
              <p>
                Readiness describes physical condition. Reservations,
                assignments, and dated blocks also affect availability.
              </p>
            </details>
          </div>

          <HousekeepingPanel room={current} onReload={refresh} />

          <details className="room-focus__accordion">
            <summary>
              <span>Room details</span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>

            <div className="room-focus__content">
              <dl className="room-ui__facts">
                <div>
                  <dt>Floor</dt>
                  <dd>{current.floor || "Not recorded"}</dd>
                </div>

                <div>
                  <dt>Room active</dt>
                  <dd>{current.isActive ? "Active" : "Inactive"}</dd>
                </div>

                <div>
                  <dt>Room type active</dt>
                  <dd>
                    {current.roomType.isActive ? "Active" : "Inactive"}
                  </dd>
                </div>
              </dl>
            </div>
          </details>

          <details className="room-focus__accordion">
            <summary>
              <span>
                Dated blocks
                {blocks.status === "ready" && (
                  <small>{blocks.data.length} recorded blocks</small>
                )}
              </span>

              <ChevronDown size={18} aria-hidden="true" />
            </summary>

            <div className="room-focus__content">
              <p className="room-focus__muted">
                Start date is included; end date is excluded.
                Cancelled blocks remain in history.
              </p>

              <StaffDataState
                state={blocks}
                label="Room block history"
              />

              {blocks.status === "ready" && (
                blocks.data.length === 0 ? (
                  <p>No dated blocks recorded for this room.</p>
                ) : (
                  <ol className="room-focus__history">
                    {blocks.data.map((block) => (
                      <li key={block.id}>
                        <strong>
                          {formatStayDate(block.startDate)} →{" "}
                          {formatStayDate(block.endDate)}
                        </strong>

                        <span>{block.reason}</span>

                        <span>
                          {block.canceledAt
                            ? "Cancelled " +
                              formatTimestamp(block.canceledAt)
                            : "Not cancelled"}
                        </span>

                        <small>
                          Created {formatTimestamp(block.createdAt)}
                        </small>
                      </li>
                    ))}
                  </ol>
                )
              )}
            </div>
          </details>
        </>
      )}

      {canManage && (
        <details className="room-focus__accordion">
          <summary>
            <span>Management tools</span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>

          <div className="room-focus__content room-focus__management">
            <RoomManagement
              key={roomId}
              room={room}
              blocks={blocks}
            />
          </div>
        </details>
      )}
    </section>
  );
}