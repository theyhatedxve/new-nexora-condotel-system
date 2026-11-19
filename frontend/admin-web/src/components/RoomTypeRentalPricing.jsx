import { useState, useSyncExternalStore } from "react";
import { getSession, subscribeSession } from "../services/authApi";
import { useStaffData } from "../hooks/useStaffData";
import { readRentalPricing } from "../services/rentalPricingApi.js";
import { RENTAL_TYPES } from "../utils/rentalPricing.js";
import { formatPesos } from "../utils/formatters";
import useRentalPricingForm, { PRICING_ROLES } from "../hooks/useRentalPricingForm.js";

import "../styles/rental-pricing.css";

function PricingForm({
  pricing,
  actorId,
  reload,
  onSaved,
  onBusy,
}) {
  const {
    draft, review, error, blocked, saving, changeRate,
    changeIncludedOccupancy, backToEditing, prepare, save,
  } = useRentalPricingForm({ pricing, actorId, onSaved, onBusy });

  return (
    <form className="rental-pricing__form" onSubmit={prepare}>
      <div className="rental-pricing__heading">
        <div>
          <h3>{pricing.name}</h3>
          <p>Maximum capacity: {pricing.capacity} guests.</p>
        </div>

        <button
          type="button"
          className="room-types-screen__secondary"
          disabled={saving}
          onClick={reload}
        >
          Reload current pricing
        </button>
      </div>

      <p id="rental-pricing-help">
        Enter amounts in PHP without commas. Each rental type needs a
        positive price, including disabled types. Missing prices are
        left blank. Nightly pricing must stay enabled.
      </p>

      {error && (
        <p className="rental-pricing__error" role="alert">
          {error}
        </p>
      )}

      <fieldset
        className="rental-pricing__inputs"
        disabled={saving || Boolean(review) || blocked}
        aria-describedby="rental-pricing-help"
      >
        <legend>Occupancy and rental rates</legend>

        <div className="rental-pricing__occupancy">
          <label htmlFor="pricing-included-guests">
            Guests included in the price
          </label>
          <input
            id="pricing-included-guests"
            type="number"
            min="1"
            max={pricing.capacity}
            step="1"
            required
            value={draft.includedOccupancy}
            onChange={changeIncludedOccupancy}
          />
        </div>

        <div className="rental-pricing__rates">
          {RENTAL_TYPES.map(({ value, label, unit }, index) => {
            const rate = draft.rates[index];

            return (
              <fieldset
                className="rental-pricing__rate"
                key={value}
              >
                <legend>{label}</legend>

                <label htmlFor={`pricing-${value}-price`}>
                  Price per {unit} — PHP
                </label>
                <input
                  id={`pricing-${value}-price`}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]+([.][0-9]{1,2})?"
                  maxLength={11}
                  required
                  placeholder="Enter price"
                  value={rate.price}
                  onChange={(event) =>
                    changeRate(index, "price", event.target.value)
                  }
                />

                <label htmlFor={`pricing-${value}-extra`}>
                  Extra guest fee per {unit} — PHP
                </label>
                <input
                  id={`pricing-${value}-extra`}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]+([.][0-9]{1,2})?"
                  maxLength={11}
                  required
                  value={rate.extraFee}
                  onChange={(event) =>
                    changeRate(index, "extraFee", event.target.value)
                  }
                />

                <label
                  className="rental-pricing__toggle"
                  htmlFor={`pricing-${value}-enabled`}
                >
                  <input
                    id={`pricing-${value}-enabled`}
                    type="checkbox"
                    checked={rate.isActive}
                    disabled={value === "NIGHTLY"}
                    onChange={(event) =>
                      changeRate(
                        index,
                        "isActive",
                        event.target.checked,
                      )
                    }
                  />
                  {value === "NIGHTLY"
                    ? "Always enabled"
                    : "Enable for guest searches"}
                </label>
              </fieldset>
            );
          })}
        </div>
      </fieldset>

      <p>
        The extra guest fee applies to each guest above the included
        count, for each rental unit. Existing reservations keep their
        saved prices.
      </p>

      {!review && (
        <button
          type="submit"
          className="room-types-screen__primary"
          disabled={saving || blocked}
        >
          Review pricing
        </button>
      )}

      {review && (
        <section
          className="rental-pricing__review"
          aria-labelledby="pricing-review-heading"
        >
          <h3 id="pricing-review-heading">Review rental pricing</h3>
          <p>
            {pricing.name} · Included guests:{" "}
            {review.includedOccupancy}
          </p>

          <ul>
            {review.rates.map((rate) => {
              const rental = RENTAL_TYPES.find(
                (item) => item.value === rate.rentalType,
              );

              return (
                <li key={rate.rentalType}>
                  <strong>{rental.label}:</strong>{" "}
                  {formatPesos(rate.rateCentavos)} / {rental.unit}
                  {" · "}Extra guest:{" "}
                  {formatPesos(rate.extraPersonFeeCentavos)}
                  {" / "}{rental.unit}
                  {" · "}{rate.isActive ? "Enabled" : "Disabled"}
                </li>
              );
            })}
          </ul>

          <div className="rental-pricing__actions">
            <button
              type="button"
              className="room-types-screen__primary"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving…" : "Confirm and save pricing"}
            </button>

            <button
              type="button"
              className="room-types-screen__secondary"
              disabled={saving}
              onClick={backToEditing}
            >
              Back to editing
            </button>
          </div>
        </section>
      )}

      {saving && <p role="status">Saving rental pricing…</p>}
    </form>
  );
}

function PricingLoader({ roomTypeId, actorId, onSaved, onBusy }) {
  const pricing = useStaffData(readRentalPricing, roomTypeId);

  if (pricing.loading) {
    return <p role="status">Loading rental pricing…</p>;
  }

  if (pricing.status !== "ready") {
    return (
      <div>
        <p role="alert">
          {pricing.status === "denied"
            ? "This account cannot access rental pricing."
            : "Rental pricing could not be loaded."}
        </p>
        <button
          type="button"
          className="room-types-screen__secondary"
          onClick={pricing.reload}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <PricingForm
      key={`${pricing.data.id}:${pricing.data.updatedAt}`}
      pricing={pricing.data}
      actorId={actorId}
      reload={pricing.reload}
      onBusy={onBusy}
      onSaved={(name) => {
        pricing.reload();
        onSaved(name);
      }}
    />
  );
}

function RentalPricingWorkspace({ records, actorId }) {
  const [roomTypeId, setRoomTypeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const items = records.status === "ready" ? records.data : [];
  const selected = items.find((item) => item.id === roomTypeId);

  return (
    <section
      className="rental-pricing"
      aria-labelledby="rental-pricing-title"
      aria-busy={busy}
    >
      <h2 id="rental-pricing-title">Rental Pricing</h2>
      <p>
        Create the room type first, then select it here to configure
        hourly, nightly, weekly, and monthly rates.
      </p>

      {message && <p role="status">{message}</p>}

      <label htmlFor="pricing-room-type">Room type</label>
      <select
        id="pricing-room-type"
        value={roomTypeId}
        disabled={busy || records.status !== "ready"}
        onChange={(event) => {
          setRoomTypeId(event.target.value);
          setMessage("");
        }}
      >
        <option value="">Select a room type</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}{item.isActive ? "" : " — inactive"}
          </option>
        ))}
      </select>

      {records.status !== "ready" && (
        <p>Load the room categories above to manage pricing.</p>
      )}

      {selected && (
        <>
          {!selected.isActive && (
            <p>
              This category is inactive. Its rates can be configured,
              but it will not appear in guest availability searches.
            </p>
          )}

          <PricingLoader
            key={selected.id}
            roomTypeId={selected.id}
            actorId={actorId}
            onBusy={setBusy}
            onSaved={(name) => {
              setMessage(`Rental pricing saved for ${name}.`);
              records.reload();
            }}
          />
        </>
      )}
    </section>
  );
}

export default function RoomTypeRentalPricing({ records }) {
  const session = useSyncExternalStore(subscribeSession, getSession);

  if (
    session.status !== "authenticated" ||
    !PRICING_ROLES.includes(session.user?.role)
  ) {
    return null;
  }

  return (
    <RentalPricingWorkspace
      key={session.user.id}
      records={records}
      actorId={session.user.id}
    />
  );
}
