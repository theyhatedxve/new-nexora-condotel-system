import { createContext, useContext } from "react";

export const GuestAuthContext = createContext(null);

export function useGuestAuth() {
  const context = useContext(GuestAuthContext);
  if (!context) {
    throw new Error("useGuestAuth requires GuestAuthProvider.");
  }
  return context;
}
