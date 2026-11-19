import { useState } from "react";
import useReservationCharges from "./useReservationCharges";
import { parsePropertyCollectionAmount } from "../services/paymentsApi";
import { formatPesos, formatStatus, formatTimestamp } from "../utils/formatters";

export default function useReservationChargeForm({ actorId, reservationId, onReload }) {
  const [kind, setKind] = useState("DAMAGE");
  const [reason, setReason] = useState("");
  const workflow = useReservationCharges(actorId, reservationId, onReload);
  const { prepare, setMessage } = workflow;

  function propose(event) {
    event.preventDefault();
    try {
      const data = new FormData(event.currentTarget);
      if (kind === "DAMAGE") {
        const amount = parsePropertyCollectionAmount(String(data.get("amount") || ""));
        const description = String(data.get("description") || "").trim();
        const evidenceNotes = String(data.get("evidence") || "").trim();
        prepare({ action: "PROPOSE_DAMAGE", description, evidenceNotes, amountCentavos: amount },
          "Propose damage: " + description + " — " + formatPesos(amount));
      } else {
        const at = new Date(String(data.get("departure")) + ":00+08:00").toISOString();
        prepare({ action: "PROPOSE_EXTENSION", requestedDepartureAt: at },
          "Request extension to " + formatTimestamp(at) + ". The backend calculates the quote.");
      }
    } catch { setMessage("Check the amount, description and Philippine departure time."); }
  }
  function action(type, item) {
    const needsReason = ["REJECT", "REFUND_UNFULFILLED_EXTENSION"].includes(type);
    if (needsReason && reason.trim().length < 3) { setMessage("Enter a reason of at least 3 characters."); return; }
    prepare({
      action: type, chargeId: item.id,
      ...(needsReason ? { reason: reason.trim() } : {}),
      ...(type === "COLLECT" ? { moneyReceived: true } : {}),
      ...(type === "REFUND_UNFULFILLED_EXTENSION" ? { moneyReturned: true } : {}),
    }, formatStatus(type) + ": " + item.description + " — " + formatPesos(item.amountCentavos) +
      (needsReason ? ". Reason: " + reason.trim() : "") +
      (item.requestedDepartureAt ? ". To: " + formatTimestamp(item.requestedDepartureAt) : ""));
  }
  return { ...workflow, kind, setKind, reason, setReason, propose, action };
}
