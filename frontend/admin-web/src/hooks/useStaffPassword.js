import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import api from "../services/api";
import { getSession } from "../services/authApi";

function readInvitationToken(hash) {
  const params = new URLSearchParams(hash.slice(1));
  const value = params.get("token") ?? "";
  return /^[a-f0-9]{64}$/.test(value) ? value : "";
}

export default function useStaffPassword(mode) {
  const location = useLocation();
  const invitation = mode === "invitation";

  const [token, setToken] = useState(() => readInvitationToken(location.hash));

  const [email, setEmail] = useState(
    typeof location.state?.email === "string" ? location.state.email : "",
  );
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [state, setState] = useState({ status: "idle", message: "" });
  const busy = useRef(false);
  const mounted = useRef(false);
  const requestVersion = useRef(0);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      requestVersion.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!invitation || !location.hash) return;

    requestVersion.current += 1;
    busy.current = false;
    setToken(readInvitationToken(location.hash));
    setTemporaryPassword("");
    setNewPassword("");
    setConfirmation("");
    setState({ status: "idle", message: "" });

    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  }, [invitation, location.hash]);

  async function submit(event) {
    event.preventDefault();

    if (
      busy.current ||
      state.status === "success" ||
      state.status === "unknown" ||
      getSession().status !== "anonymous"
    ) {
      return;
    }

    if (invitation && !token) {
      setState({
        status: "error",
        message: "Open the complete invitation link from your email.",
      });
      return;
    }

    if (newPassword !== confirmation) {
      setState({ status: "error", message: "The new passwords must match." });
      return;
    }

    if (!invitation && newPassword === temporaryPassword) {
      setState({
        status: "error",
        message: "Choose a different password from your temporary password.",
      });
      return;
    }

    const input = invitation
      ? { token, newPassword }
      : {
          email: email.trim().toLowerCase(),
          temporaryPassword,
          newPassword,
        };

    busy.current = true;
    const submittedVersion = requestVersion.current;
    setState({ status: "pending", message: "Saving your password…" });
    setTemporaryPassword("");
    setNewPassword("");
    setConfirmation("");

    try {
      const response = await api.post(
        invitation
          ? "/auth/staff/setup-password"
          : "/auth/staff/change-temporary-password",
        input,
      );

      if (typeof response.data?.data?.message !== "string") {
        throw new Error("Invalid password response.");
      }

      if (!mounted.current || submittedVersion !== requestVersion.current) return;

      setState({
        status: "success",
        message: "Password saved. Sign in with your new password.",
      });
    } catch (error) {
      if (!mounted.current || submittedVersion !== requestVersion.current) return;
      const status = error.response?.status;

      if (status === 429) {
        setState({
          status: "error",
          message: "Too many attempts. Wait a minute before trying again.",
        });
      } else if ([400, 401, 403, 404, 409, 422].includes(status)) {
        setState({
          status: "error",
          message: invitation
            ? "Password setup was rejected. Check the link and password requirements. Ask an administrator for a new invitation if needed."
            : "Password change was rejected. Check your email and temporary password, or contact an administrator.",
        });
      } else {
        setState({
          status: "unknown",
          message:
            "The result could not be confirmed. Try signing in with your new password before submitting another change.",
        });
      }
    } finally {
      if (submittedVersion === requestVersion.current) {
        busy.current = false;
      }
    }
  }

  function allowReviewedRetry() {
    setState({ status: "idle", message: "Enter your passwords again to retry." });
  }

  return {
    invitation,
    validToken: Boolean(token),
    email,
    setEmail,
    temporaryPassword,
    setTemporaryPassword,
    newPassword,
    setNewPassword,
    confirmation,
    setConfirmation,
    state,
    submit,
    allowReviewedRetry,
  };
}
