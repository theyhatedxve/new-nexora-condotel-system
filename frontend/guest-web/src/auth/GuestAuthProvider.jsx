import { GuestAuthContext } from "./useGuestAuth";
import useGuestSession from "../hooks/useGuestSession";
import {
  restoreGuestSession,
  signInGuest,
  signOutGuest,
} from "../services/guestAuthApi";

export default function GuestAuthProvider({ children }) {
  const session = useGuestSession();
  return (
    <GuestAuthContext.Provider
      value={{
        ...session,
        signIn: signInGuest,
        signOut: signOutGuest,
        retry: restoreGuestSession,
      }}
    >
      {children}
    </GuestAuthContext.Provider>
  );
}
