import { useState } from "react";
import { useAuth } from "../auth/useAuth";

export default function useStaffLogin() {
  const { status, user, message, signIn, signOut, retry } = useAuth();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  if (status === "authenticated") {
    return {
      status,
      user,
      message,
      email,
      password,
      retrySession,
      changeEmail,
      changePassword,
    };
  }

  if (status !== "anonymous") {
    return {
      status,
      user,
      message,
      email,
      password,
      retrySession,
      changeEmail,
      changePassword,
    };
  }

  async function submit(event) {
    event.preventDefault();

    const submittedPassword = password;

    setPassword("");

    await signIn(email.trim(), submittedPassword);
  }

  function retrySession() {
    return void (status === "logout-error" ? signOut() : retry());
  }

  function changeEmail(event) {
    return setEmail(event.target.value);
  }

  function changePassword(event) {
    return setPassword(event.target.value);
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
