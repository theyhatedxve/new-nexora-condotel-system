import { useState } from "react";
import useReservationDeposits from "./useReservationDeposits.js";
import { parsePropertyCollectionAmount } from "../../payments/services/paymentsApi.js";
import { formatPesos } from "../../../shared/utils/formatters.js";

export default function useReservationDepositForm({ actorId, reservationId, onReload }) {
  const [reason, setReason] = useState("");
  const workflow = useReservationDeposits(actorId, reservationId, onReload);
  const { prepare, setMessage } = workflow;

  function review(action, fields, label) {
    const actionReason = reason.trim();

    if (actionReason.length < 3) {
      setMessage("Enter a reason of at least 3 characters.");
      return;
    }

    prepare(
      { action, reason: actionReason, ...fields },
      `${label}. Reason: ${actionReason}`,
    );
  }

  function collect(event) {
    event.preventDefault();

    try {
      const amount = parsePropertyCollectionAmount(
        String(new FormData(event.currentTarget).get("amount") || ""),
      );

      review(
        "COLLECT",
        { amountCentavos: amount, moneyReceived: true },
        `Record cash deposit ${formatPesos(amount)}`,
      );
    } catch {
      setMessage("Enter a valid positive deposit amount in PHP.");
    }
  }

  return { ...workflow, reason, setReason, review, collect };
}
