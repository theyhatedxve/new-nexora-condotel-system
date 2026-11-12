import { useEffect, useRef, useState } from "react";
import { guestAuthError, registerGuest } from "../services/guestAuthApi";

export default function useGuestRegistration() {
  const [fields, setFields] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmation: "",
  });
  const [state, setState] = useState({ status: "idle", message: "" });
  const busy = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function change(event) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy.current || state.status === "received") return;
    if (!fields.firstName.trim() || !fields.lastName.trim()) {
      setState({ status: "error", message: "Enter your first and last name." });
      return;
    }
    if (fields.password !== fields.confirmation) {
      setState({ status: "error", message: "The passwords must match." });
      return;
    }
    const input = {
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      email: fields.email.trim().toLowerCase(),
      password: fields.password,
    };
    busy.current = true;
    setState({ status: "pending", message: "Submitting registration…" });
    setFields((current) => ({ ...current, password: "", confirmation: "" }));
    try {
      await registerGuest(input);
      if (!mounted.current) return;
      setState({
        status: "received",
        message: "Registration received. Check your inbox for a verification link. If you already have an account, try signing in.",
      });
    } catch (error) {
      if (!mounted.current) return;
      setState({
        status: "error",
        message: guestAuthError(error) + " Check your inbox before submitting again, or request a verification link.",
      });
    } finally {
      busy.current = false;
    }
  }

  return { fields, state, change, submit };
}
