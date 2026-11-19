export default function StaffDataState({ state, label }) {
  if (state.status === "ready") return null;

  if (state.status === "loading") {
    return <p role="status">Loading {label}…</p>;
  }

  const message =
    state.status === "not-found"
      ? "This record was not found."
      : state.status === "denied"
        ? "This account cannot access this information."
        : state.status === "review"
          ? "Payment records require financial review."
          : label + " could not be loaded.";

  return (
    <div className="feedback">
      <p role="alert">{message}</p>

      <button type="button" onClick={state.reload}>
        Try again
      </button>
    </div>
  );
}
