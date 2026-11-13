import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

export default function useGuestNavigation() {
  const location = useLocation();
  const [openLocationKey, setOpenLocationKey] = useState(null);

  const menuButtonRef = useRef(null);
  const menuOpen = openLocationKey === location.key;

  useEffect(() => {
    setOpenLocationKey(null);
  }, [location.key]);

  function closeMenu() {
    setOpenLocationKey(null);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && menuOpen) {
      event.preventDefault();
      closeMenu();
      menuButtonRef.current?.focus();
    }
  }

  function toggleMenu() {
    setOpenLocationKey((current) =>
      current === location.key ? null : location.key,
    );
  }

  return { menuOpen, menuButtonRef, closeMenu, handleKeyDown, toggleMenu };
}
