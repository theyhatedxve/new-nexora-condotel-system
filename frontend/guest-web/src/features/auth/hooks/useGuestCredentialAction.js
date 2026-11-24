import { useEffect, useRef, useState } from "react";
import { guestCredentialError } from "../services/guestCredentialsApi.js";

export default function useGuestCredentialAction() {
  const [state, setState] = useState({ status: "idle", message: "" });
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function run(action) {
    if (busy.current) return;
    busy.current = true;
    setState({ status: "pending", message: "Sending request…" });
    try {
      const message = await action();
      if (mounted.current) setState({ status: "success", message: message || "Your account was updated." });
    } catch (error) {
      if (mounted.current) setState({ status: "error", message: guestCredentialError(error) });
    } finally { busy.current = false; }
  }
  return { ...state, run, pending: state.status === "pending" };
}
