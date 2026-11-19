import { useEffect, useRef } from "react";

export default function useRoomChangeReview({ change }) {
  const heading = useRef(null);

  const state = change.state;

  useEffect(() => {
    if (state.status !== "idle") {
      heading.current?.focus();
    }
  }, [state.status]);

  if (state.status === "idle") return { heading, state, handleKeyDown, confirmAction };

  const confirming = state.status === "confirm";

  const pending = state.status === "pending";

  function handleKeyDown(event) {
    if (event.key === "Escape" && confirming && change.sameScope) {
      event.preventDefault();
      change.back();
    }
  }

  function confirmAction() {
    void change.confirm();
  }

  return { heading, state, confirming, pending, handleKeyDown, confirmAction };
}
