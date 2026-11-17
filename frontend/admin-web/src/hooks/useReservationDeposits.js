import { useEffect, useRef, useState } from "react";
import { useStaffData } from "./useStaffData";
import {
  depositStorageKey, recoverDepositRequest, listReservationDeposits, sendDepositRequest,
} from "../services/reservationDepositsApi";

function restore(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return { draft: raw ? recoverDepositRequest(JSON.parse(raw)) : null, error: "" };
  } catch {
    return { draft: null, error: "Deposit recovery is unavailable. Review the original request before continuing." };
  }
}
export default function useReservationDeposits(actorId, id, onReload) {
  const key = depositStorageKey(actorId, id);
  const [initial] = useState(() => restore(key));
  const [draft, setDraft] = useState(initial.draft);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initial.error);
  const sending = useRef(false);
  const heading = useRef(null);
  const history = useStaffData(listReservationDeposits, JSON.stringify([actorId, id, page]));
  useEffect(() => { if (draft) heading.current?.focus(); }, [draft]);
  function prepare(command, label) {
    if (draft || sending.current || initial.error) return;
    setDraft({ command: { ...command, requestId: crypto.randomUUID() }, label, phase: "review" });
    setMessage("");
  }
  function back() {
    if (!draft || sending.current || draft.phase === "pending") return;
    if (draft.phase === "rejected") {
      try { sessionStorage.removeItem(key); } catch { setMessage("Recovery storage could not be cleared."); return; }
    }
    setDraft(null);
  }
  async function submit() {
    if (!draft || sending.current || initial.error) return;
    sending.current = true;
    setBusy(true);
    const wasUncertain = draft.phase === "pending";
    let persisted = false;
    try {
      sessionStorage.setItem(key, JSON.stringify({ command: draft.command, label: draft.label }));
      persisted = true;
      setDraft({ ...draft, phase: "pending" });
      const result = await sendDepositRequest(actorId, id, draft.command);
      sessionStorage.removeItem(key);
      setDraft(null);
      setMessage(result.replayed ? "Original deposit request recovered." : "Deposit action recorded.");
      setPage(1);
      history.reload();
      onReload();
    } catch (error) {
      const status = error.response?.status;
      if (persisted && !wasUncertain && [400, 401, 403, 404, 409, 429].includes(status)) {
        setDraft({ ...draft, phase: "rejected" });
        setMessage("Request rejected (HTTP " + status + "). Reload records before preparing another request.");
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
