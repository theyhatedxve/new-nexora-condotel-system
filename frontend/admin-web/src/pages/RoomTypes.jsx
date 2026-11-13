import { Link } from "react-router";
import {
  ArrowLeft,
  BedDouble,
  Pencil,
  RefreshCw,
  Users,
} from "lucide-react";
import { useStaffData } from "../hooks/useStaffData";
import { listStaffRoomTypes } from "../services/roomTypesApi";
import StaffDataState from "../components/StaffDataState";
import RoomTypeManagement from "../components/RoomTypeManagement";
import { formatPesos } from "../utils/formatters";
import "../styles/room-types.css";

export default function RoomTypes() {
  const records = useStaffData(listStaffRoomTypes);

  function focusManagement() {
    document.getElementById("type-management-title")?.focus();
  }

  return (
    <section
      className="room-types-screen"
      aria-labelledby="room-types-title"
    >
      <Link className="room-types-screen__back" to="/rooms">
        <ArrowLeft size={16} aria-hidden="true" />
        Return to rooms
      </Link>

      <header className="room-types-screen__heading">
        <div>
          <h1 id="room-types-title">Room types</h1>
          <p>Manage room descriptions, guest capacity, and base nightly rates.</p>
        </div>

        <div className="room-types-screen__actions">
          <button
            type="button"
            className="room-types-screen__secondary"
            onClick={records.reload}
            disabled={records.loading}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>

          <button
            type="button"
            className="room-types-screen__primary"
            onClick={focusManagement}
          >
            <Pencil size={16} aria-hidden="true" />
            Create or edit
          </button>
        </div>
      </header>

      <p className="room-types-screen__notice">
        Room types define the details shared by physical rooms. Creating a room
        type does not create physical rooms. Existing reservations retain their
        saved prices when current rates change.
      </p>

      <section
        className="room-types-screen__catalog"
        aria-labelledby="room-type-catalog-title"
      >
        <h2 id="room-type-catalog-title">Room-type catalog</h2>

        <StaffDataState state={records} label="Room types" />

        {records.status === "ready" && (
          <>
            <p className="room-types-screen__summary" role="status">
              {records.data.length} room types found.
            </p>

            {records.data.length === 0 ? (
              <p className="room-types-screen__empty" role="status">
                No room types found for this property. Use the form below to
                review a new room type.
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
                          <BedDouble size={24} />
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
                          <dt>Guest capacity</dt>
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
            )}
          </>
        )}
      </section>

      <RoomTypeManagement records={records} />
    </section>
  );
}
