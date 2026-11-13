import api from "./api";
import { STAFF_ROLES } from "../auth/staffNavigation";

export const STAFF_STATUSES = ["PENDING", "ACTIVE", "DISABLED"];

export const STATUS_LABELS = {
  PENDING: "Pending",
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

function validateUser(user) {
  if (
    typeof user?.id !== "string" ||
    (user.name !== null && typeof user.name !== "string") ||
    typeof user.email !== "string" ||
    !STAFF_ROLES.includes(user.role) ||
    !STAFF_STATUSES.includes(user.status) ||
    typeof user.mustChangePassword !== "boolean" ||
    typeof user.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(user.updatedAt))
  ) {
    throw new Error("Invalid staff account response.");
  }

  return user;
}

export async function listStaffUsers(params, signal) {
  const response = await api.get("/staff/users", { params, signal });
  const data = response.data?.data;

  if (
    !Array.isArray(data?.items) ||
    !Number.isInteger(data.total) ||
    data.total < 0 ||
    !Number.isInteger(data.page) ||
    data.page < 1 ||
    ![20, 50].includes(data.limit) ||
    !Number.isInteger(data.totalPages) ||
    data.totalPages < 0
  ) {
    throw new Error("Invalid staff directory response.");
  }

  data.items.forEach(validateUser);
  return data;
}

export async function getStaffUser(id, signal) {
  const response = await api.get(
    "/staff/users/" + encodeURIComponent(id),
    { signal },
  );

  return validateUser(response.data?.data);
}

export async function sendStaffUserChange(request) {
  let response;

  if (request.kind === "create") {
    response = await api.post("/staff/users", request.input, {
      timeout: 35_000,
    });
  } else if (request.kind === "update") {
    response = await api.patch(
      "/staff/users/" + encodeURIComponent(request.id),
      request.input,
    );
  } else if (request.kind === "invitation") {
    response = await api.post(
      "/staff/users/" + encodeURIComponent(request.id) + "/invitation",
      request.input,
      { timeout: 35_000 },
    );
  } else {
    throw new Error("Unsupported staff account operation.");
  }

  const result = response.data?.data;
  validateUser(result?.user);

  if (request.kind === "update") {
    if (typeof result.changed !== "boolean") {
      throw new Error("Invalid staff update response.");
    }
  } else if (
    !["SMTP_ACCEPTED", "UNKNOWN", "NOT_REQUESTED"].includes(result.delivery)
  ) {
    throw new Error("Invalid invitation response.");
  }

  return result;
}

export function staffChangeMessage(result) {
  if (result.delivery === "SMTP_ACCEPTED") {
    return "Account saved. The email server accepted the invitation. Check the recipient’s inbox.";
  }

  if (result.delivery === "UNKNOWN") {
    return "Account saved. Invitation delivery is unknown. Review the account before issuing another invitation.";
  }

  if (result.delivery === "NOT_REQUESTED") {
    return "Account saved. The staff member must change the temporary password before signing in.";
  }

  return result.changed
    ? "Account updated."
    : "The account already matches the submitted values.";
}

export function staffRequestError(error) {
  const status = error.response?.status;

  if (status === 401) return "Your session ended. Sign in again.";
  if (status === 403) return "Administrator access is required.";
  if (status === 429) {
    return "Too many requests. Wait a minute before trying again.";
  }

  const message = error.response?.data?.message;

  if (
    [400, 404, 409, 422].includes(status) &&
    typeof message === "string" &&
    message.length <= 600
  ) {
    return message;
  }

  if ([400, 404, 409, 422].includes(status)) {
    return "The request was rejected. Reload and review the account.";
  }

  return "The operation could not be confirmed. Reload and review the account before submitting again.";
}
