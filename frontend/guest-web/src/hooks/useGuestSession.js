import { useEffect, useSyncExternalStore } from "react";
import {
  getGuestSession,
  restoreGuestSession,
  subscribeGuestSession,
} from "../services/guestAuthApi";

export default function useGuestSession() {
  const session = useSyncExternalStore(subscribeGuestSession, getGuestSession);

  useEffect(() => {
    void restoreGuestSession();
  }, []);

  useEffect(() => {
    if (session.status !== "authenticated") return;
    function refresh() {
      if (document.visibilityState === "visible") {
        void restoreGuestSession({ ifStale: true });
      }
    }
    const timer = window.setInterval(refresh, 12 * 60 * 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [session.status]);

  return session;
}
