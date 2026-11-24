export default function GuestCredentialFeedback({ state }) {
  return state.message ? (
    <p className="guest-auth__feedback" role={state.status === "error" ? "alert" : "status"}>
      {state.message}
    </p>
  ) : null;
}
