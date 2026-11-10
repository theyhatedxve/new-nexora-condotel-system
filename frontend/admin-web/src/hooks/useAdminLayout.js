import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useAuth } from "../auth/useAuth";
import { staffNavigation } from "../auth/staffNavigation";

export default function useAdminLayout() {
  const { user, signOut } = useAuth();

  const location = useLocation();

  const [openedAt, setOpenedAt] = useState(null);

  const open = openedAt === location.key;

  const menuButton = useRef(null);

  const main = useRef(null);

  const title =
    staffNavigation.find(
      (item) =>
        item.path === location.pathname ||
        (item.path !== "/" && location.pathname.startsWith(item.path + "/")),
    )?.label ?? "Page not found";

  useEffect(() => {
    document.title = title + " | NEXORA";
    main.current?.focus();
  }, [location.pathname, title]);

  function closeMenu() {
    setOpenedAt(null);
    main.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && open) {
      setOpenedAt(null);
      menuButton.current?.focus();
    }
  }

  function toggleMenu() {
    return setOpenedAt(open ? null : location.key);
  }

  function signOutStaff() {
    return void signOut();
  }

  return {
    user,
    open,
    menuButton,
    main,
    title,
    closeMenu,
    handleKeyDown,
    toggleMenu,
    signOutStaff,
  };
}
