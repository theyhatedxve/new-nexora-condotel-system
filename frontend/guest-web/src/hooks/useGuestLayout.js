import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export default function useGuestLayout() {
  const location = useLocation();

  const mainContentRef = useRef(null);

  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    // Move focus only when navigating to another route.
    if (previousPathRef.current !== location.pathname) {
      mainContentRef.current?.focus();
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  return { mainContentRef };
}
