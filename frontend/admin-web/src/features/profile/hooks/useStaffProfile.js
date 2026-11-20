import { useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth.js";
import {
  endStaffProfileSession, updateStaffProfileName,
} from "../../auth/services/authApi.js";
import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import {
  changeStaffCredential, getStaffProfile, saveStaffProfile,
} from "../services/staffProfileApi.js";

function failureMessage(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string"
    ? message
    : "The update could not be confirmed. Reload your profile before retrying.";
}

export default function useStaffProfile() {
  const { user } = useAuth();
  const resource = useStaffData(getStaffProfile, user.id);
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const submitting = useRef(false);

  function reload() {
    if (submitting.current) return;
    setUnknown(false);
    setFeedback(null);
    resource.reload();
  }

  async function submit(event, kind) {
    event.preventDefault();
    if (submitting.current || unknown || resource.status !== "ready") return;

    const form = event.currentTarget;
    const values = new FormData(form);
    const value = (name) => String(values.get(name) ?? "");
    const input = { updatedAt: resource.data.updatedAt };

    if (kind === "details") {
      Object.assign(input, {
        name: value("name").trim(), phone: value("phone").trim(),
        address: value("address").trim(),
      });
    } else if (kind === "email") {
      Object.assign(input, {
        email: value("email").trim().toLowerCase(),
        currentPassword: value("currentPassword"),
      });
    } else if (kind === "password") {
      Object.assign(input, {
        currentPassword: value("currentPassword"),
        newPassword: value("newPassword"), confirmPassword: value("confirmPassword"),
      });
      if (input.newPassword !== input.confirmPassword) {
        setFeedback({ error: true, text: "The new passwords do not match." });
        return;
      }
    } else {
      return;
    }

    submitting.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      if (kind === "details") {
        const profile = await saveStaffProfile(user.id, input);
        updateStaffProfileName(user.id, profile.name);
        setFeedback({ error: false, text: "Your profile was saved." });
        resource.reload();
      } else {
        await changeStaffCredential(user.id, kind, input);
        endStaffProfileSession(user.id, kind === "email"
          ? "Your email was changed. Sign in with your new email."
          : "Your password was changed. Sign in with your new password.");
      }
    } catch (error) {
      const status = error.response?.status;
      if (!status || status >= 500) setUnknown(true);
      setFeedback({ error: true, text: failureMessage(error) });
    } finally {
      form.querySelectorAll('input[type="password"]').forEach((inputElement) => {
        inputElement.value = "";
      });
      submitting.current = false;
      setBusy(false);
    }
  }

  return { resource, busy, unknown, feedback, reload, submit };
}
