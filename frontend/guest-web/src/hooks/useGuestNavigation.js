import { useRef, useState } from "react";
import { useLocation } from "react-router";

export default function useGuestNavigation() {
  const location = useLocation();
  const menuButtonRef = useRef(null);

  const [navigation, setNavigation] = useState({
    locationKey: location.key,
    open: false,
  });

  if (navigation.locationKey !== location.key) {
    setNavigation({
      locationKey: location.key,
      open: false,
    });
  }

  const menuOpen =
    navigation.locationKey === location.key && navigation.open;

  function closeMenu() {
    setNavigation({
      locationKey: location.key,
      open: false,
    });
  }

  function toggleMenu() {
    setNavigation((current) => ({
      locationKey: location.key,
      open:
        current.locationKey === location.key
          ? !current.open
          : true,
    }));
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && menuOpen) {
      event.preventDefault();
      closeMenu();
      menuButtonRef.current?.focus();
    }
  }

  return {
    menuOpen,
    menuButtonRef,
    closeMenu,
    handleKeyDown,
    toggleMenu,
  };
}
