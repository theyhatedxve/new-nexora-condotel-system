import { useRef, useState } from "react";

export default function useGuestNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuButtonRef = useRef(null);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && menuOpen) {
      event.preventDefault();
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }

  function toggleMenu() {
    setMenuOpen((open) => !open);
  }

  return { menuOpen, menuButtonRef, closeMenu, handleKeyDown, toggleMenu };
}
