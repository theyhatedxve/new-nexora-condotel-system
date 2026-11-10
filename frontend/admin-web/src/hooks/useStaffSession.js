import { useEffect, useSyncExternalStore } from "react";
import { getSession, restoreSession, subscribeSession } from "../services/authApi";

export default function useStaffSession() {
  const session = useSyncExternalStore(subscribeSession, getSession);

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

    const timer = window.setInterval(refresh, 12 * 60 * 1000);

    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [session.status]);

  return { session };
}
