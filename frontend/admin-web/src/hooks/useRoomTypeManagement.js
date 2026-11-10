import { useState } from "react";
import { useRoomTypeChange } from "./useRoomTypeChange";
import { centavosToPesosInput, pesosToCentavos } from "../services/roomTypesApi";
import { formatPesos } from "../utils/formatters";
import { emptyDraft } from "../utils/roomTypeManagementHelpers.js";

export default function useRoomTypeManagement({ records }) {
  const change = useRoomTypeChange(records);

  const [roomTypeId, setRoomTypeId] = useState("");

  const [draft, setDraft] = useState(emptyDraft);

  const [savedVersion, setSavedVersion] = useState("");

  const [error, setError] = useState("");

  const items = records.status === "ready" ? records.data : [];

  const current = items.find((item) => item.id === roomTypeId);

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
      nightlyRate: centavosToPesosInput(item.baseRateCentavos),
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

      if (editing && (!current || JSON.stringify(current) !== savedVersion)) {
        throw new Error(
          "This room type changed. Load its current values before reviewing another edit.",
        );
      }

      if (
        items.some((item) => item.id !== roomTypeId && item.name === draft.name.trim())
      ) {
        throw new Error("That name is already listed. Review the existing room type.");
      }

      const rate = pesosToCentavos(draft.nightlyRate);

      const lines = editing
        ? [
            "Existing type: " + current.name,
            "Name: " + draft.name.trim(),
            "Description: " + (draft.description.trim() || "Not recorded"),
            "Capacity: " + current.capacity + " → " + draft.capacity.trim(),
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
            "Description: " + (draft.description.trim() || "Not recorded"),
            "Capacity: " + draft.capacity.trim(),
            "Nightly rate: " + formatPesos(rate),
            "Initial active state: Yes",
          ];

      change.prepare(
        {
          kind: editing ? "edit-room-type" : "create-room-type",
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

  function changeSelectedType(event) {
    return selectType(event.target.value);
  }

  function reloadSelectedType() {
    return selectType(roomTypeId);
  }

  function startNewType() {
    return selectType("");
  }

  function changeName(event) {
    return edit("name", event.target.value);
  }

  function changeDescription(event) {
    return edit("description", event.target.value);
  }

  function changeCapacity(event) {
    return edit("capacity", event.target.value);
  }

  function changeNightlyRate(event) {
    return edit("nightlyRate", event.target.value);
  }

  function changeIsActive(event) {
    return edit("isActive", event.target.value === "yes");
  }

  return {
    change,
    roomTypeId,
    draft,
    error,
    items,
    current,
    prepare,
    changeSelectedType,
    reloadSelectedType,
    startNewType,
    changeName,
    changeDescription,
    changeCapacity,
    changeNightlyRate,
    changeIsActive,
  };
}
