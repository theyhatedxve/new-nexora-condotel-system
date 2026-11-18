import { Link } from "react-router";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import HousekeepingPanel from "../components/HousekeepingPanel.jsx";
import StaffDataState from "../components/StaffDataState";
import RoomManagement from "../components/RoomManagement";
import useRoomDetailsPage from "../hooks/useRoomDetailsPage.js";

import {
  formatStatus,
  formatStayDate,
  formatTimestamp,
} from "../utils/formatters";

import "../styles/room-workspace.css";

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

  return (
    <section
      className="room-details-screen room-ui"
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
          {refreshing ? "Refreshing…" : "Refresh room"}
        </button>
      </header>

      <h1 id="room-title" className="room-ui__sr-only">
        Room details
      </h1>

      <StaffDataState state={room} label="Room details" />

      {ready && (
        <>
          <section
            className="room-ui__identity"
            aria-labelledby="room-identity-title"
          >
            <span className="room-ui__identity-icon">
              <BedDouble size={30} aria-hidden="true" />
            </span>

            <div className="room-ui__identity-text">
              <p className="room-ui__eyebrow">Physical room</p>
              <h2 id="room-identity-title">
                Room {room.data.roomNumber}
              </h2>
              <p>{room.data.roomType.name}</p>
            </div>

            <span
              className="room-ui__badge"
              data-status={room.data.status}
            >
              {formatStatus(room.data.status)}
            </span>
          </section>

          <nav
            className="room-ui__section-nav"
            aria-label="Room details sections"
          >
            <a href="#room-information">Room Information</a>
            <a href="#room-housekeeping">Housekeeping</a>
            <a href="#room-block-history">Dated Blocks</a>

            {canManage && (
              <a href="#room-management-tools">Management</a>
            )}
          </nav>

          <section
            id="room-information"
            className="room-ui__card"
            aria-labelledby="room-information-title"
            tabIndex={-1}
          >
            <h2 id="room-information-title">
              <BedDouble size={21} aria-hidden="true" />
              Room Information
            </h2>

            <dl className="room-ui__facts">
              <div>
                <dt>Floor</dt>
                <dd>{room.data.floor || "Not recorded"}</dd>
              </div>

              <div>
                <dt>Guest capacity</dt>
                <dd>
                  {room.data.roomType.capacity}{" "}
                  {room.data.roomType.capacity === 1
                    ? "guest"
                    : "guests"}
                </dd>
              </div>

              <div>
                <dt>Room active</dt>
                <dd>
                  <span
                    className="room-ui__badge"
                    data-active={String(room.data.isActive)}
                  >
                    {room.data.isActive ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>

              <div>
                <dt>Room type active</dt>
                <dd>
                  <span
                    className="room-ui__badge"
                    data-active={String(room.data.roomType.isActive)}
                  >
                    {room.data.roomType.isActive ? "Active" : "Inactive"}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <div
            id="room-housekeeping"
            className="room-ui__section"
            role="region"
            aria-label="Housekeeping"
            tabIndex={-1}
          >
            <HousekeepingPanel
              room={room.data}
              onReload={refresh}
            />
          </div>

          <section
            id="room-block-history"
            className="record-section"
            aria-labelledby="blocks-title"
            tabIndex={-1}
          >
            <h2 id="blocks-title">
              <CalendarDays size={21} aria-hidden="true" />
              Dated Block History
            </h2>

            <p className="room-ui__muted">
              A block includes its start date and excludes its end date.
              Cancelled blocks remain in history.
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
                        <th scope="col">Start Date</th>
                        <th scope="col">End Date</th>
                        <th scope="col">Reason</th>
                        <th scope="col">Cancellation</th>
                        <th scope="col">Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {blocks.data.map((block) => (
                        <tr key={block.id}>
                          <td>{formatStayDate(block.startDate)}</td>
                          <td>{formatStayDate(block.endDate)}</td>
                          <td>{block.reason}</td>
                          <td>
                            {block.canceledAt
                              ? "Cancelled " +
                                formatTimestamp(block.canceledAt)
                              : "Not cancelled"}
                          </td>
                          <td>{formatTimestamp(block.createdAt)}</td>
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

      {canManage && (
        <div
          id="room-management-tools"
          className="room-ui__management"
          role="region"
          aria-labelledby="room-management-title"
          tabIndex={-1}
        >
          <RoomManagement
            key={roomId}
            room={room}
            blocks={blocks}
          />
        </div>
      )}
    </section>
  );
}