import { Link } from "react-router";
import {
  ArrowLeft,
  BedDouble,
  RefreshCw,
  Users,
} from "lucide-react";

import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import { listStaffRoomTypes } from "../services/roomTypesApi.js";
import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import RoomTypeDialogs from "../components/RoomTypeDialogs.jsx";
import { formatPesos } from "../../../shared/utils/formatters.js";

import "../styles/room-types.css";
import "../styles/room-workspace.css";

export default function RoomTypes() {
  const records = useStaffData(listStaffRoomTypes);

  return (
    <section
      className="room-types-screen room-ui"
      aria-labelledby="room-types-title"
    >
      <header className="room-ui__toolbar">
        <Link className="room-ui__back" to="/rooms">
          <ArrowLeft size={17} aria-hidden="true" />
          Return to rooms
        </Link>

        <div className="room-ui__actions">
          <button
            type="button"
            className="room-types-screen__secondary"
            onClick={records.reload}
            disabled={records.loading}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {records.loading ? "Refreshing…" : "Refresh"}
          </button>

          <RoomTypeDialogs records={records} />
        </div>
      </header>

      <h1 id="room-types-title" className="room-ui__sr-only">
        Room Types
      </h1>

      <p className="room-ui__intro">
        Manage category descriptions, guest capacity, and rental pricing.
      </p>

      <p className="room-types-screen__notice">
        Room types describe physical rooms. Create physical rooms separately.
        Existing reservations retain their saved prices when current rates change.
      </p>

      <section
        className="room-types-screen__catalog"
        aria-labelledby="room-type-catalog-title"
      >
        <div className="room-ui__catalog-heading">
          <h2 id="room-type-catalog-title">Room Categories</h2>

          {records.status === "ready" && (
            <p className="room-types-screen__summary" role="status">
              {records.data.length}{" "}
              {records.data.length === 1 ? "category" : "categories"}
            </p>
          )}
        </div>

        <StaffDataState state={records} label="Room types" />

        {records.status === "ready" && (
          records.data.length === 0 ? (
            <p className="room-types-screen__empty" role="status">
              No room types found. Authorized staff can use Create or edit to add a category.
            </p>
          ) : (
            <ul className="room-types-screen__list">
              {records.data.map((item) => (
                <li key={item.id}>
                  <article className="room-types-screen__card">
                    <div className="room-types-screen__card-heading">
                      <span
                        className="room-types-screen__icon"
                        aria-hidden="true"
                      >
                        <BedDouble size={27} />
                      </span>

                      <h3>{item.name}</h3>

                      <span
                        className="room-types-screen__badge"
                        data-active={String(item.isActive)}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="room-types-screen__description">
                      {item.description || "Description not recorded."}
                    </p>

                    <dl className="room-types-screen__facts">
                      <div>
                        <dt>Maximum occupants</dt>
                        <dd className="room-types-screen__capacity">
                          <Users size={16} aria-hidden="true" />
                          {item.capacity}{" "}
                          {item.capacity === 1 ? "guest" : "guests"}
                        </dd>
                      </div>

                      <div>
                        <dt>Base nightly rate</dt>
                        <dd className="room-types-screen__rate">
                          {formatPesos(item.baseRateCentavos)}
                          <span> / night</span>
                        </dd>
                      </div>
                    </dl>
                  </article>
                </li>
              ))}
            </ul>
          )
        )}
      </section>


    </section>
  );
}
