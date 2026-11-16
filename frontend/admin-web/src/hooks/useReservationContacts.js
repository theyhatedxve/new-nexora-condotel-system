import { useEffect, useRef, useState } from "react";
import { useStaffData } from "./useStaffData";
import {
  contactDraft, contactStorageKey, listReservationContacts, saveReservationContact,
} from "../services/reservationContactsApi";

function recover(key) {
  try {
    const saved = sessionStorage.getItem(key);
    return { intent: saved ? { draft: contactDraft(JSON.parse(saved)), submitted: true } : null };
  } catch {
    return { intent: null, error: "Saved contact recovery is unavailable. Review the original request before recording another." };
  }
}

export default function useReservationContacts(actorId, reservationId) {
  const key = contactStorageKey(actorId, reservationId);
  const [initial] = useState(() => recover(key));
  const [intent, setIntent] = useState(initial.intent);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const sending = useRef(false);
  const heading = useRef(null);
  const reviewHeading = useRef(null);
  useEffect(() => {
    if (intent) reviewHeading.current?.focus();
  }, [intent]);
  const history = useStaffData(
    listReservationContacts, JSON.stringify([actorId, reservationId, page]),
  );

  function prepare(event) {
    event.preventDefault();
    if (intent || sending.current || initial.error) return;
    try {
      const data = new FormData(event.currentTarget);
      const estimate = String(data.get("estimate") || "");
      const draft = contactDraft({
        requestId: crypto.randomUUID(),
        channel: data.get("channel"), purpose: data.get("purpose"),
        result: data.get("result"), notes: String(data.get("notes") || ""),
        ...(estimate ? { expectedArrivalAt: estimate + ":00+08:00" } : {}),
      });
      setIntent({ draft, submitted: false });
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function submit() {
    if (!intent || sending.current || initial.error) return;
    sending.current = true;
    setBusy(true);
    let persisted = intent.submitted;
    try {
      sessionStorage.setItem(key, JSON.stringify(intent.draft));
      persisted = true;
      setIntent({ draft: intent.draft, submitted: true });
      const result = await saveReservationContact(actorId, reservationId, intent.draft);
      sessionStorage.removeItem(key);
      setIntent(null);
      setMessage(result.replayed ? "The original contact record was recovered." : "Contact follow-up recorded.");
      setPage(1);
      history.reload();
      heading.current?.focus();
    } catch {
      setMessage(persisted
        ? "The outcome could not be confirmed. Retry the original request with the same details."
        : "The request could not be saved for recovery. No contact request was sent.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  function back() {
    if (intent && !intent.submitted && !sending.current) setIntent(null);
  }

  return {
    history, page, setPage, intent, busy, message, error: initial.error,
    heading, reviewHeading, prepare, submit, back,
  };
}
