import { Building2, LockKeyhole, Save } from "lucide-react";
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
    handleKeepDraftSettings,
  } = useSettingsEditor({ initial, actorId });

  return (
    <>
      <p className="settings-page__version">
        Loaded version:{" "}
        {timestamp.format(new Date(current.property.updatedAt))} (Asia/Manila).
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
        <section
          className="settings-panel"
          aria-labelledby="settings-property-title"
        >
          <h2 id="settings-property-title">
            <Building2 size={20} aria-hidden="true" />
            Property information
          </h2>

          <p className="settings-page__muted">
            Update the fields below, then review the proposed changes before
            saving.
          </p>

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
                  <span className="settings-page__field-note">
                    {field.required ? " (required)" : " (optional)"}
                  </span>
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
              <button type="submit" className="settings-page__primary">
                Review changes
              </button>
            </div>
          </form>
        </section>
      )}

      {(mode === "review" || mode === "pending") && reviewed && (
        <section
          className="settings-panel"
          aria-labelledby="settings-review-title"
          aria-busy={mode === "pending"}
        >
          <h2 id="settings-review-title">Review property changes</h2>

          <p className="settings-page__muted">
            Only the fields below will change.
          </p>

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
            <button
              type="button"
              className="settings-page__secondary"
              disabled={mode === "pending"}
              onClick={backToEdit}
            >
              Back to editing
            </button>

            <button
              type="button"
              className="settings-page__primary"
              disabled={mode === "pending"}
              onClick={save}
            >
              <Save size={16} aria-hidden="true" />
              {mode === "pending" ? "Saving..." : "Save property settings"}
            </button>
          </div>

          {mode === "pending" && (
            <p role="status">
              Saving settings. A second submission is disabled.
            </p>
          )}
        </section>
      )}

      {recovery && (
        <section
          className="settings-panel"
          aria-labelledby="settings-recovery-title"
        >
          <h2 id="settings-recovery-title">Your preserved values</h2>

          <PropertyValues values={reviewed ?? draft} />

          <button
            type="button"
            className="settings-page__secondary"
            onClick={reloadCurrent}
          >
            Reload current settings
          </button>
        </section>
      )}

      {mode === "checking" && (
        <p className="settings-page__loading" role="status">
          Reading the current stored settings. Your submitted values are
          preserved.
        </p>
      )}

      {mode === "loaded" && comparison && (
        <section
          className="settings-panel"
          aria-labelledby="settings-loaded-title"
        >
          <h2 id="settings-loaded-title">Current stored settings</h2>

          <p role="status">
            {comparison.matches
              ? "The current stored values match your submitted values. This does not prove that the interrupted request caused them."
              : "The current stored values differ from your submitted values."}
          </p>

          <PropertyValues values={comparison.data.property} />

          <p className="settings-page__version">
            Stored version:{" "}
            {timestamp.format(new Date(comparison.data.property.updatedAt))}{" "}
            (Asia/Manila).
          </p>

          <div className="settings-actions">
            <button
              type="button"
              className="settings-page__secondary"
              onClick={handleApplyLoadedSettings}
            >
              Use loaded settings
            </button>

            <button
              type="button"
              className="settings-page__primary"
              onClick={handleKeepDraftSettings}
            >
              Keep my values for review
            </button>
          </div>
        </section>
      )}

      <section
        className="settings-panel settings-page__reference"
        aria-labelledby="settings-reference-title"
      >
        <h2 id="settings-reference-title">
          <LockKeyhole size={20} aria-hidden="true" />
          Operational reference
        </h2>

        <p className="settings-page__muted">
          Read-only values from existing backend constants.
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

        <p className="settings-page__muted">
          The reservation hold value applies to the pending-reservation workflow.
          It does not establish the lifetime of a PayMongo Hosted Checkout
          session.
        </p>
      </section>
    </>
  );
}
