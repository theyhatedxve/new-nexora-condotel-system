import { Link } from "react-router";

import { useStaffData } from "../hooks/useStaffData";

import {
  listStaffRoomTypes,
} from "../services/roomTypesApi";

import StaffDataState from "../components/StaffDataState";
import RoomTypeManagement from "../components/RoomTypeManagement";

import { formatPesos } from "../utils/formatters";

export default function RoomTypes() {
  const records = useStaffData(listStaffRoomTypes);

  return (
    <section aria-labelledby="room-types-title">
      <Link to="/rooms">Return to rooms</Link>

      <div className="records-heading">
        <h1 id="room-types-title">
          Room types and rates
        </h1>

        <button
          type="button"
          onClick={records.reload}
          disabled={records.loading}
        >
          Refresh room types
        </button>
      </div>

      <p>
        Room types define the description, capacity, and
        current base nightly rate shared by physical rooms.
        Creating a type does not create physical rooms.
      </p>

      <StaffDataState
        state={records}
        label="Room types"
      />

      {records.status === "ready" && (
        <>
          <p>{records.data.length} room types found.</p>

          {records.data.length === 0 ? (
            <p role="status">
              No room types found for this property.
            </p>
          ) : (
            <div
              className="records-scroll"
              role="region"
              aria-label="Room types table"
              tabIndex={0}
            >
              <table className="records-table">
                <caption>
                  Active and inactive room types
                </caption>

                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Description</th>
                    <th scope="col">Capacity</th>
                    <th scope="col">Base nightly rate</th>
                    <th scope="col">Active</th>
                  </tr>
                </thead>

                <tbody>
                  {records.data.map((item) => (
                    <tr key={item.id}>
                      <th scope="row">{item.name}</th>

                      <td>
                        {item.description || "Not recorded"}
                      </td>

                      <td>{item.capacity}</td>

                      <td>
                        {formatPesos(item.baseRateCentavos)}
                      </td>

                      <td>{item.isActive ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <RoomTypeManagement records={records} />
    </section>
  );
}