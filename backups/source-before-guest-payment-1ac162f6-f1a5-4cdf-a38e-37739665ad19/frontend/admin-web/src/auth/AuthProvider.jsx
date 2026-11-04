import {
  useEffect,
  useSyncExternalStore,
} from "react";

import {
  getSession,
  restoreSession,
  signIn,
  signOut,
  subscribeSession,
} from "../services/authApi";

import { AuthContext } from "./useAuth";

export function AuthProvider({ children }) {
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
  );

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    if (session.status !== "authenticated") return;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void restoreSession({ ifStale: true });
      }
    };

    const timer = window.setInterval(
      refresh,
      12 * 60 * 1000,
    );

    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [session.status]);

  return (
    <AuthContext.Provider
      value={{
        ...session,
        signIn,
        signOut,
        retry: restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}