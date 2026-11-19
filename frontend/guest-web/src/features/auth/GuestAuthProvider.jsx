import { GuestAuthContext } from "./useGuestAuth.js";
import useGuestSession from "./hooks/useGuestSession.js";
import {
  restoreGuestSession,
  signInGuest,
  signOutGuest,
} from "./services/guestAuthApi.js";

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
