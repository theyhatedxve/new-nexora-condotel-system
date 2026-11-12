import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useGuestAuth } from "../auth/useGuestAuth";
import { getGuestReturnPath, rememberGuestReturnPath } from "../utils/guestReturnPath";

export default function useGuestLogin() {
  const auth = useGuestAuth();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const busy = useRef(false);

  useEffect(() => {
    rememberGuestReturnPath(returnTo);
  }, [returnTo]);

  async function submit(event) {
    event.preventDefault();
    if (busy.current || auth.status !== "anonymous") return;
    busy.current = true;
    const submittedPassword = password;
    setPassword("");
    try {
      await auth.signIn(email, submittedPassword);
    } finally {
      busy.current = false;
    }
  }

  return {
    auth, email, setEmail, password, setPassword, submit,
    destination: getGuestReturnPath(returnTo),
  };
}
