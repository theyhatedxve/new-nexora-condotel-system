import { Link } from "react-router";

import { useStaffData } from "../hooks/useStaffData";
import { listRooms } from "../services/roomsApi";
import StaffDataState from "../components/StaffDataState";
import { formatStatus } from "../utils/formatters";

import { useAuth } from "../auth/useAuth";
import CreateRoomForm from "../components/CreateRoomForm";

export default function Rooms() {
  const state = useStaffData(listRooms);

  const { user } = useAuth();

  const canManage = [
    "ADMIN",
    "MANAGER",
  ].includes(user?.role);

  return (
    <section aria-labelledby="rooms-title">
      <div className="records-heading">
        <h1 id="rooms-title">Rooms</h1>

        <button
          type="button"
          onClick={state.reload}
          disabled={state.loading}
        >
          Refresh rooms
        </button>
      </div>

      <p>
        Current room status is shown below. Availability
        for a stay also depends on dates, reservations,
        assignments, and room blocks.
      </p>

      <StaffDataState state={state} label="Rooms" />

      {state.status === "ready" && (
        <>
          <p>{state.data.length} rooms found.</p>

          {state.data.length === 0 ? (
            <p role="status">
              No rooms found for this property.
            </p>
          ) : (
            <div
              className="records-scroll"
              role="region"
              aria-label="Rooms table"
              tabIndex={0}
            >
              <table className="records-table">
                <caption>Physical rooms</caption>

                <thead>
                  <tr>
                    <th scope="col">Room</th>
                    <th scope="col">Floor</th>
                    <th scope="col">Room type</th>
                    <th scope="col">Capacity</th>
                    <th scope="col">Status</th>
                    <th scope="col">Room active</th>
                    <th scope="col">Type active</th>
                  </tr>
                </thead>

                <tbody>
                  {state.data.map((room) => (
                    <tr key={room.id}>
                      <td>
                        <Link
                          to={
                            "/rooms/" +
                            encodeURIComponent(room.id)
                          }
                        >
                          {room.roomNumber}
                        </Link>
                      </td>

                      <td>{room.floor || "Not recorded"}</td>
                      <td>{room.roomType.name}</td>
                      <td>{room.roomType.capacity}</td>
                      <td>{formatStatus(room.status)}</td>
                      <td>{room.isActive ? "Yes" : "No"}</td>
                      <td>
                        {room.roomType.isActive ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
          )}
        </>
      )}
    {canManage && (
    <p>
        <Link to="/rooms/types">
        Manage room types and nightly rates
        </Link>
    </p>
    )}
      {canManage && (
        <CreateRoomForm rooms={state} />
        )}
    </section>
  );
}