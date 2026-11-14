import { useEffect, useRef, useState } from "react";
import { getSession } from "../services/authApi";
import {
  getPropertySettings,
  normalizePropertyInput,
  PROPERTY_FIELDS,
  propertyDraft,
  savePropertySettings,
} from "../services/settingsApi";

export default function useSettingsEditor({ initial, actorId }) {
  const [current, setCurrent] = useState(initial);

  const [draft, setDraft] = useState(() => propertyDraft(initial.property));

  const [reviewed, setReviewed] = useState(null);

  const [mode, setMode] = useState("edit");

  const [message, setMessage] = useState("");

  const [comparison, setComparison] = useState(null);

  const busy = useRef(false);

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  function sameActor() {
    const session = getSession();

    return (
      mounted.current &&
      session.status === "authenticated" &&
      session.user?.id === actorId &&
      session.user.role === "ADMIN"
    );
  }

  function review(event) {
    event.preventDefault();
    setMessage("");

    if (busy.current || mode !== "edit") {
      return;
    }

    try {
      const values = normalizePropertyInput(draft);

      const changed = PROPERTY_FIELDS.some(
        (field) => current.property[field.key] !== values[field.key],
      );

      if (!changed) {
        setMessage("No changes to save.");

        return;
      }

      setReviewed(values);
      setMode("review");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Check the property information.",
      );
    }
  }

  async function save() {
    if (busy.current || mode !== "review" || !reviewed || !sameActor()) {
      return;
    }

    busy.current = true;
    setMode("pending");
    setMessage("");

    try {
      const result = await savePropertySettings(current.property, reviewed, actorId);

      if (!sameActor()) return;

      setCurrent(result);
      setDraft(propertyDraft(result.property));
      setReviewed(null);
      setComparison(null);
      setMode("edit");

      setMessage(
        result.changed
          ? "Property settings saved."
          : "The property settings were unchanged.",
      );
    } catch (error) {
      if (!sameActor()) return;

      const status = error.response?.status;

      if (status === 400) {
        setReviewed(null);
        setMode("edit");
        setMessage(
          "The server rejected the submitted values. Check the required fields, email address, and length limits.",
        );
      } else if (status === 401 || status === 403) {
        setMode("blocked");
        setMessage(
          "Administrator access is unavailable. Sign in again before continuing.",
        );
      } else if (status === 409) {
        setMode("conflict");
        setMessage(
          "Another change was saved first. Your values are preserved. Reload the current settings before reviewing another submission.",
        );
      } else {
        setMode("unknown");
        setMessage(
          "The save outcome could not be confirmed. Your values are preserved. Reload the current settings before submitting again.",
        );
      }
    } finally {
      busy.current = false;
    }
  }

  async function reloadCurrent() {
    if (busy.current || !sameActor()) {
      return;
    }

    busy.current = true;
    setMode("checking");
    setMessage("");

    try {
      const result = await getPropertySettings();

      if (!sameActor()) return;

      if (result.property.id !== current.property.id) {
        throw new Error("The configured property changed.");
      }

      const values = reviewed ?? normalizePropertyInput(draft);

      const matches = PROPERTY_FIELDS.every(
        (field) => result.property[field.key] === values[field.key],
      );

      setComparison({
        data: result,
        matches,
      });

      setMode("loaded");
    } catch (error) {
      if (!sameActor()) return;

      const status = error.response?.status;

      if (status === 401 || status === 403) {
        setMode("blocked");
        setMessage(
          "Administrator access is unavailable. Sign in again before continuing.",
        );
      } else {
        setMode("reload-error");
        setMessage(
          "Current settings could not be read. Your values remain preserved. Try loading the current record again.",
        );
      }
    } finally {
      busy.current = false;
    }
  }

  function applyLoadedSettings(keepDraft) {
    if (!comparison || busy.current || !sameActor()) {
      return;
    }

    const loaded = comparison.data;

    setCurrent(loaded);

    if (!keepDraft) {
      setDraft(propertyDraft(loaded.property));
    }

    setReviewed(null);
    setComparison(null);
    setMode("edit");

    setMessage(
      keepDraft
        ? "Your values are preserved against the newly loaded version. Review them before saving."
        : "The current stored settings are loaded.",
    );
  }

  const changedFields = reviewed
    ? PROPERTY_FIELDS.filter(
        (field) => current.property[field.key] !== reviewed[field.key],
      )
    : [];

  const recovery = ["unknown", "conflict", "reload-error"].includes(mode);

  function changeDraft(event, field) {
    return setDraft((previous) => ({
      ...previous,
      [field.key]: event.target.value,
    }));
  }

  function backToEdit() {
    setReviewed(null);
    setMode("edit");
    setMessage("");
  }

  function handleApplyLoadedSettings() {
    return applyLoadedSettings(false);
  }

  function handleKeepDraftSettings() {
    return applyLoadedSettings(true);
  }

  return {
    current,
    draft,
    reviewed,
    mode,
    message,
    comparison,
    review,
    save,
    reloadCurrent,
    changedFields,
    recovery,
    changeDraft,
    backToEdit,
    handleApplyLoadedSettings,
    handleKeepDraftSettings,
  };
}
