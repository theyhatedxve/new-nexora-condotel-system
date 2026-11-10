import { PROPERTY_FIELDS } from "../../services/settingsApi";
import { timestamp } from "../../constants/settings.js";
import { displayValue } from "../../utils/settingsHelpers.js";
import useSettingsEditor from "../../hooks/useSettingsEditor.js";
import { PropertyValues } from "./PropertyValues.jsx";

export function SettingsEditor({ initial, actorId }) {
  const {
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
  } = useSettingsEditor({ initial, actorId });

  return (
    <>
      <p>
        Loaded version: {timestamp.format(new Date(current.property.updatedAt))}{" "}
        (Asia/Manila).
      </p>

      {message && (
        <p
          role={
            ["unknown", "conflict", "reload-error", "blocked"].includes(mode)
              ? "alert"
              : "status"
          }
          className="feedback"
        >
          {message}
        </p>
      )}

      {mode === "edit" && (
        <form className="settings-form" onSubmit={review}>
          {PROPERTY_FIELDS.map((field) => (
            <div
              key={field.key}
              className={
                field.key === "description" || field.key === "address"
                  ? "settings-field settings-wide"
                  : "settings-field"
              }
            >
              <label htmlFor={`property-${field.key}`}>
                {field.label}
                {field.required ? " (required)" : " (optional)"}
              </label>

              {field.key === "description" ? (
                <textarea
                  id={`property-${field.key}`}
                  value={draft[field.key]}
                  maxLength={field.max}
                  rows={5}
                  onChange={(event) => changeDraft(event, field)}
                />
              ) : (
                <input
                  id={`property-${field.key}`}
                  type={field.type ?? "text"}
                  value={draft[field.key]}
                  required={field.required}
                  maxLength={field.max}
                  onChange={(event) => changeDraft(event, field)}
                />
              )}
            </div>
          ))}

          <div className="settings-actions settings-wide">
            <button type="submit">Review changes</button>
          </div>
        </form>
      )}

      {(mode === "review" || mode === "pending") && reviewed && (
        <section className="settings-panel" aria-labelledby="settings-review-title">
          <h2 id="settings-review-title">Review property changes</h2>

          <p>Only the fields below will change.</p>

          <div className="settings-review-list">
            {changedFields.map((field) => (
              <article key={field.key}>
                <h3>{field.label}</h3>

                <dl>
                  <dt>Current value</dt>
                  <dd>{displayValue(current.property[field.key])}</dd>

                  <dt>Proposed value</dt>
                  <dd>{displayValue(reviewed[field.key])}</dd>
                </dl>
              </article>
            ))}
          </div>

          <div className="settings-actions">
            <button type="button" disabled={mode === "pending"} onClick={backToEdit}>
              Back to editing
            </button>

            <button type="button" disabled={mode === "pending"} onClick={save}>
              {mode === "pending" ? "Saving..." : "Save property settings"}
            </button>
          </div>

          {mode === "pending" && (
            <p role="status">Saving settings. A second submission is disabled.</p>
          )}
        </section>
      )}

      {recovery && (
        <section className="settings-panel" aria-labelledby="settings-recovery-title">
          <h2 id="settings-recovery-title">Your preserved values</h2>

          <PropertyValues values={reviewed ?? draft} />

          <button type="button" onClick={reloadCurrent}>
            Reload current settings
          </button>
        </section>
      )}

      {mode === "checking" && (
        <p role="status">
          Reading the current stored settings. Your submitted values are preserved.
        </p>
      )}

      {mode === "loaded" && comparison && (
        <section className="settings-panel" aria-labelledby="settings-loaded-title">
          <h2 id="settings-loaded-title">Current stored settings</h2>

          <p role="status">
            {comparison.matches
              ? "The current stored values match your submitted values. This does not prove that the interrupted request caused them."
              : "The current stored values differ from your submitted values."}
          </p>

          <PropertyValues values={comparison.data.property} />

          <p>
            Stored version:{" "}
            {timestamp.format(new Date(comparison.data.property.updatedAt))}{" "}
            (Asia/Manila).
          </p>

          <div className="settings-actions">
            <button type="button" onClick={handleApplyLoadedSettings}>
              Use loaded settings
            </button>

            <button type="button" onClick={handleApplyLoadedSettings}>
              Keep my values for review
            </button>
          </div>
        </section>
      )}

      <section className="settings-panel" aria-labelledby="settings-reference-title">
        <h2 id="settings-reference-title">Operational reference</h2>

        <p>
          These values come from existing backend constants and cannot be edited here.
        </p>

        <dl className="settings-values">
          <div>
            <dt>Pending reservation hold duration</dt>

            <dd>{current.reference.reservationHoldMinutes} minutes</dd>
          </div>

          <div>
            <dt>Private booking-link lifetime</dt>

            <dd>{current.reference.bookingLinkMinutes} minutes</dd>
          </div>
        </dl>

        <p>
          The reservation hold value applies to the pending-reservation workflow. It does
          not establish the lifetime of a PayMongo Hosted Checkout session.
        </p>
      </section>
    </>
  );
}
