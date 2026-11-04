import { useState } from "react";

import { useRoomTypeChange } from "../hooks/useRoomTypeChange";

import {
  centavosToPesosInput,
  pesosToCentavos,
} from "../services/roomTypesApi";

import { formatPesos } from "../utils/formatters";

import RoomChangeReview from "./RoomChangeReview";

function emptyDraft() {
  return {
    name: "",
    description: "",
    capacity: "",
    nightlyRate: "",
    isActive: true,
  };
}

export default function RoomTypeManagement({ records }) {
  const change = useRoomTypeChange(records);

  const [roomTypeId, setRoomTypeId] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [savedVersion, setSavedVersion] = useState("");
  const [error, setError] = useState("");

  const items =
    records.status === "ready" ? records.data : [];

  const current = items.find(
    (item) => item.id === roomTypeId,
  );

  function selectType(id) {
    setError("");
    setRoomTypeId(id);

    if (!id) {
      setDraft(emptyDraft());
      setSavedVersion("");
      return;
    }

    const item = items.find((type) => type.id === id);

    if (!item) {
      setError("The selected room type is unavailable.");
      return;
    }

    setDraft({
      name: item.name,
      description: item.description ?? "",
      capacity: String(item.capacity),
      nightlyRate: centavosToPesosInput(
        item.baseRateCentavos,
      ),
      isActive: item.isActive,
    });

    setSavedVersion(JSON.stringify(item));
  }

  function edit(field, value) {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function prepare(event) {
    event.preventDefault();
    setError("");

    try {
      if (records.status !== "ready") {
        throw new Error("Load the room types first.");
      }

      const editing = Boolean(roomTypeId);

      if (
        editing &&
        (
          !current ||
          JSON.stringify(current) !== savedVersion
        )
      ) {
        throw new Error(
          "This room type changed. Load its current values before reviewing another edit.",
        );
      }

      if (
        items.some(
          (item) =>
            item.id !== roomTypeId &&
            item.name === draft.name.trim(),
        )
      ) {
        throw new Error(
          "That name is already listed. Review the existing room type.",
        );
      }

      const rate = pesosToCentavos(draft.nightlyRate);

      const lines = editing
        ? [
            "Existing type: " + current.name,
            "Name: " + draft.name.trim(),
            "Description: " +
              (draft.description.trim() || "Not recorded"),
            "Capacity: " +
              current.capacity +
              " → " +
              draft.capacity.trim(),
            "Nightly rate: " +
              formatPesos(current.baseRateCentavos) +
              " → " +
              formatPesos(rate),
            "Active: " +
              (current.isActive ? "Yes" : "No") +
              " → " +
              (draft.isActive ? "Yes" : "No"),
            "Existing reservations keep their saved prices.",
          ]
        : [
            "Name: " + draft.name.trim(),
            "Description: " +
              (draft.description.trim() || "Not recorded"),
            "Capacity: " + draft.capacity.trim(),
            "Nightly rate: " + formatPesos(rate),
            "Initial active state: Yes",
          ];

      change.prepare(
        {
          kind: editing
            ? "edit-room-type"
            : "create-room-type",
          roomTypeId: editing ? roomTypeId : undefined,
          ...draft,
        },
        editing ? "Edit room type" : "Create room type",
        lines,
        event.nativeEvent.submitter,
      );
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <section
      className="record-section room-management"
      aria-labelledby="type-management-title"
    >
      <h2 id="type-management-title">
        Create or edit a room type
      </h2>

      <p>
        Changes to current rates do not recalculate existing
        reservation prices. Capacity and deactivation
        requests are checked against existing commitments.
      </p>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={prepare}>
        <fieldset
          className="action-fields"
          disabled={change.disabled}
        >
          <legend>
            {roomTypeId ? "Edit room type" : "New room type"}
          </legend>

          <label htmlFor="managed-room-type">
            Room type to manage
          </label>
          <select
            id="managed-room-type"
            value={roomTypeId}
            onChange={(event) =>
              selectType(event.target.value)
            }
          >
            <option value="">Create a new room type</option>

            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isActive ? "" : " — inactive"}
              </option>
            ))}
          </select>

          {roomTypeId ? (
            <button
              type="button"
              disabled={!current}
              onClick={() => selectType(roomTypeId)}
            >
              Load current room-type values
            </button>
          ) : (
            <button
              type="button"
              onClick={() => selectType("")}
            >
              Clear new-type inputs
            </button>
          )}

          <label htmlFor="type-name">Name</label>
          <input
            id="type-name"
            required
            maxLength={100}
            value={draft.name}
            onChange={(event) =>
              edit("name", event.target.value)
            }
          />

          <label htmlFor="type-description">
            Description
          </label>
          <textarea
            id="type-description"
            maxLength={2000}
            rows={4}
            value={draft.description}
            onChange={(event) =>
              edit("description", event.target.value)
            }
          />

          <label htmlFor="type-capacity">
            Guest capacity
          </label>
          <input
            id="type-capacity"
            type="text"
            inputMode="numeric"
            pattern="[0-9]+"
            required
            maxLength={10}
            value={draft.capacity}
            onChange={(event) =>
              edit("capacity", event.target.value)
            }
          />

          <label htmlFor="type-rate">
            Base nightly rate in PHP
          </label>
          <input
            id="type-rate"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.][0-9]{1,2})?"
            required
            maxLength={11}
            aria-describedby="type-rate-help"
            value={draft.nightlyRate}
            onChange={(event) =>
              edit("nightlyRate", event.target.value)
            }
          />

          <p id="type-rate-help">
            Use up to two decimal places, without commas.
            Example: 2500.50.
          </p>

          {roomTypeId && (
            <>
              <label htmlFor="type-active">
                Room type active
              </label>
              <select
                id="type-active"
                value={draft.isActive ? "yes" : "no"}
                onChange={(event) =>
                  edit(
                    "isActive",
                    event.target.value === "yes",
                  )
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </>
          )}

          <button type="submit">
            {roomTypeId
              ? "Review room-type edit"
              : "Review new room type"}
          </button>
        </fieldset>
      </form>

      <RoomChangeReview
        change={change}
        reviewMessage={
          "Fresh room types are loaded. Compare the table " +
          "with the requested name, description, capacity, " +
          "nightly rate, and active state."
        }
      />
    </section>
  );
}