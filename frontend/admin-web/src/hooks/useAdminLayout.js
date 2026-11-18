import { useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import { useAuth } from "../auth/useAuth";
import { staffNavigation } from "../auth/staffNavigation";

const additionalTitles = [
  {
    path: "/rooms/types",
    label: "Room Types",
  },
  {
    path: "/payments/reconciliation",
    label: "Payment Reconciliation",
  },
];

const titleEntries = [
  ...staffNavigation,
  ...additionalTitles,
].sort((a, b) => b.path.length - a.path.length);

export default function useAdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const [openedAt, setOpenedAt] = useState(null);
  const open = openedAt === location.key;

  const menuButton = useRef(null);
  const main = useRef(null);

  const title =
    titleEntries.find(
      (item) =>
        item.path === location.pathname ||
        (item.path !== "/" &&
          location.pathname.startsWith(item.path + "/")),
    )?.label ?? "Page not found";

  useLayoutEffect(() => {
    document.title = title + " | NEXORA";
    main.current?.focus({ preventScroll: true });

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [location.pathname, title]);

  function closeMenu(event) {
    if (
      event?.ctrlKey ||
      event?.metaKey ||
      event?.shiftKey ||
      event?.altKey
    ) {
      return;
    }

    setOpenedAt(null);
    main.current?.focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape") return;

    const accountMenu = event.target.closest(
      "details[data-account-menu]",
    );

    if (accountMenu?.open) {
      accountMenu.open = false;
      accountMenu
        .querySelector("summary")
        ?.focus({ preventScroll: true });
      return;
    }

    if (open) {
      setOpenedAt(null);
      menuButton.current?.focus({ preventScroll: true });
    }
  }

  function toggleMenu() {
    setOpenedAt(open ? null : location.key);
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