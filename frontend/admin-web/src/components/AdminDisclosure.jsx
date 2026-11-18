import { useEffect, useRef, useState } from "react";

export default function AdminDisclosure({
  className,
  label,
  summary,
  children,
}) {
  const disclosure = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOutside(event) {
      const element = disclosure.current;

      if (element && !element.contains(event.target)) {
        element.open = false;
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);

    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [open]);

  function handleToggle(event) {
    const element = event.currentTarget;

    if (element.open) {
      const layout = element.closest(".admin-layout");

      layout
        ?.querySelectorAll("details[data-account-menu]")
        .forEach((other) => {
          if (other !== element) other.open = false;
        });
    }

    setOpen(element.open);
  }

  function handleKeyDown(event) {
    const element = disclosure.current;

    if (event.key !== "Escape" || !element?.open) return;

    event.preventDefault();
    event.stopPropagation();

    element.open = false;
    element.querySelector("summary")?.focus({ preventScroll: true });
  }

  return (
    <details
      ref={disclosure}
      className={className}
      data-account-menu
      onToggle={handleToggle}
      onKeyDown={handleKeyDown}
    >
      <summary aria-label={label}>{summary}</summary>

      {open && children}
    </details>
  );
}