import api from "../../../shared/services/api.js";
import { getSession } from "../../auth/services/authApi.js";

function requireActor(userId) {
  const session = getSession();
  if (session.status !== "authenticated" || session.user?.id !== userId) {
    throw new Error("Use the original signed-in account.");
  }
}

function readProfile(response, userId) {
  const profile = response.data?.data;
  if (
    profile?.id !== userId ||
    typeof profile.name !== "string" ||
    typeof profile.email !== "string" ||
    typeof profile.phone !== "string" ||
    typeof profile.address !== "string" ||
    typeof profile.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(profile.updatedAt)) ||
    !["SUPER_ADMIN", "ADMIN", "MANAGER", "RECEPTIONIST"].includes(profile.role)
  ) {
    throw new Error("The profile response could not be verified.");
  }
  return profile;
}

export async function getStaffProfile(userId, signal) {
  requireActor(userId);
  const response = await api.get("/staff/profile", { signal });
  requireActor(userId);
  return readProfile(response, userId);
}

export async function saveStaffProfile(userId, input) {
  requireActor(userId);
  const response = await api.patch("/staff/profile", input);
  requireActor(userId);
  return readProfile(response, userId);
}

export async function changeStaffCredential(userId, kind, input) {
  requireActor(userId);
  if (!["email", "password"].includes(kind)) {
    throw new Error("Unsupported profile operation.");
  }
  const response = await api.post("/staff/profile/" + kind, input);
  requireActor(userId);
  if (response.data?.data?.id !== userId || response.data.data.signInAgain !== true) {
    throw new Error("The credential update could not be verified.");
  }
}
