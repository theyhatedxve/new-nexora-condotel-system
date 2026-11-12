const STORAGE_KEY = "nexora.guest.return-path";

function allowedPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return null;
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;

    const permitted =
      url.pathname === "/rooms" ||
      /^\/rooms\/[^/]+$/.test(url.pathname) ||
      /^\/checkout\/[^/]+$/.test(url.pathname);

    if (!permitted) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

export function rememberGuestReturnPath(value) {
  const path = allowedPath(value);
  if (!path) return;

  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    return;
  }
}

export function getGuestReturnPath(value) {
  const supplied = allowedPath(value);
  if (supplied) return supplied;

  try {
    return allowedPath(sessionStorage.getItem(STORAGE_KEY)) ?? "/rooms";
  } catch {
    return "/rooms";
  }
}
