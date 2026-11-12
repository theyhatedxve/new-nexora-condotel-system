import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { getSession } from "../services/authApi";

export default function useStaffLogin() {
  const { status, user, message, signIn, signOut, retry } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submitting = useRef(false);

  async function submit(event) {
    event.preventDefault();

    if (submitting.current || status !== "anonymous") return;

    const submittedEmail = email.trim();
    const submittedPassword = password;
    submitting.current = true;
    setPassword("");

    try {
      const result = await signIn(submittedEmail, submittedPassword);

      if (
        result?.passwordChangeRequired &&
        getSession().status === "anonymous"
      ) {
        navigate("/staff/change-temporary-password", {
          state: { email: submittedEmail },
        });
      }
    } finally {
      submitting.current = false;
    }
  }

  function retrySession() {
    return void (status === "logout-error" ? signOut() : retry());
  }

  function changeEmail(event) {
    setEmail(event.target.value);
  }

  function changePassword(event) {
    setPassword(event.target.value);
  }

  return {
    status,
    user,
    message,
    email,
    password,
    submit,
    retrySession,
    changeEmail,
    changePassword,
  };
}
