import { useRef, useState } from "react";
import { getSession } from "../services/authApi";
import { saveRentalPricing } from "../services/rentalPricingApi.js";
import { createPricingDraft, createPricingRequest } from "../utils/rentalPricing.js";

export const PRICING_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export default function useRentalPricingForm({ pricing, actorId, onSaved, onBusy }) {
  const [draft, setDraft] = useState(
    () => createPricingDraft(pricing),
  );
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const sending = useRef(false);

  function changeRate(index, field, value) {
    setDraft((current) => ({
      ...current,
      rates: current.rates.map((rate, position) =>
        position === index ? { ...rate, [field]: value } : rate,
      ),
    }));
    setError("");
  }

  function prepare(event) {
    event.preventDefault();
    setError("");

    try {
      setReview(createPricingRequest(pricing, draft));
    } catch (failure) {
      setError(failure.message);
    }
  }

  async function save() {
    if (!review || sending.current || blocked) return;

    const session = getSession();

    if (
      session.status !== "authenticated" ||
      session.user?.id !== actorId ||
      !PRICING_ROLES.includes(session.user?.role)
    ) {
      setReview(null);
      setError("Your account changed. Reload before saving.");
      setBlocked(true);
      return;
    }

    sending.current = true;
    setSaving(true);
    onBusy(true);
    setError("");

    try {
      await saveRentalPricing(pricing.id, review);

      if (getSession().user?.id === actorId) {
        onSaved(pricing.name);
      }
    } catch (failure) {
      setReview(null);
      setBlocked(true);

      const status = failure.response?.status;

      setError(
        status === 409
          ? "Pricing changed while you were editing. Reload current pricing before saving."
          : status === 403
            ? "This account cannot change rental pricing."
            : "Saving could not be confirmed. Reload current pricing before trying again.",
      );
    } finally {
      sending.current = false;
      setSaving(false);
      onBusy(false);
    }
  }

  function changeIncludedOccupancy(event) {
    const value = event.target.value;
    setDraft((current) => ({ ...current, includedOccupancy: value }));
    setError("");
  }

  function backToEditing() {
    setReview(null);
  }

  return {
    draft, review, error, blocked, saving, changeRate,
    changeIncludedOccupancy, backToEditing, prepare, save,
  };
}
