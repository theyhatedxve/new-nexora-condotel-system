import { useEffect, useRef, useState } from "react";
import { useStaffData } from "./useStaffData";
import {
  chargeStorageKey, listReservationCharges, recoverChargeRequest, sendChargeRequest,
} from "../services/reservationChargesApi";

function restore(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return { draft: raw ? recoverChargeRequest(JSON.parse(raw)) : null, error: "" };
  } catch {
    return { draft: null, error: "Charge recovery is unavailable. Review the original request before continuing." };
  }
}
export default function useReservationCharges(actorId, id, onReload) {
  const key = chargeStorageKey(actorId, id);
  const [initial] = useState(() => restore(key));
  const [draft, setDraft] = useState(initial.draft);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initial.error);
  const sending = useRef(false);
  const heading = useRef(null);
  const history = useStaffData(listReservationCharges, JSON.stringify([actorId, id, page]));
  useEffect(() => { if (draft) heading.current?.focus(); }, [draft]);

  function prepare(command, label) {
    if (draft || sending.current || initial.error) return;
    setDraft({ command: { ...command, requestId: crypto.randomUUID() }, label, phase: "review" });
    setMessage("");
  }
  function back() {
    if (sending.current || !draft || draft.phase === "pending") return;
    if (draft.phase === "rejected") {
      try { sessionStorage.removeItem(key); } catch { setMessage("Recovery storage could not be cleared."); return; }
    }
    setDraft(null);
  }
  async function submit() {
    if (!draft || sending.current || initial.error) return;
    sending.current = true;
    setBusy(true);
    let persisted = false;
    const wasUncertain = draft.phase === "pending";
    try {
      sessionStorage.setItem(key, JSON.stringify({ command: draft.command, label: draft.label }));
      persisted = true;
      setDraft({ ...draft, phase: "pending" });
      const result = await sendChargeRequest(actorId, id, draft.command);
      sessionStorage.removeItem(key);
      setDraft(null);
      setMessage(result.outcome === "REVIEW_REQUIRED"
        ? "Extension not applied. The recorded receipt is retained for review and possible Super Admin correction."
        : result.replayed ? "Original request recovered." : "Charge action recorded.");
      setPage(1);
      history.reload();
      if (draft.command.action === "APPLY_EXTENSION" && result.outcome === "PROCESSED") onReload();
    } catch (error) {
      const status = error.response?.status;
      if (persisted && !wasUncertain && [400, 401, 403, 404, 409, 429].includes(status)) {
        setDraft({ ...draft, phase: "rejected" });
        setMessage("Request rejected (HTTP " + status + "). Reload the records before preparing another request.");
      } else {
        setMessage(persisted
          ? "Outcome unconfirmed. Retry the original unchanged request."
          : "Recovery storage failed. No request was sent.");
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return { history, page, setPage, draft, busy, message, blocked: Boolean(initial.error),
    heading, prepare, back, submit, setMessage };
}
