"use client";

import { useEffect, useState } from "react";
import { DASHBOARD_SCROLL_MAIN_ID } from "@/lib/dashboard-constants";
import Icon from "@/components/ui/Icon";

export { DASHBOARD_SCROLL_MAIN_ID };

function getScrollMain(): HTMLElement | null {
  return document.getElementById(DASHBOARD_SCROLL_MAIN_ID);
}

export default function DashboardScrollControls() {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const main = getScrollMain();
    if (!main) return;

    const update = () => {
      const { scrollTop, clientHeight, scrollHeight } = main;
      const scrollable = scrollHeight > clientHeight + 8;
      setIsScrollable(scrollable);
      setCanScrollUp(scrollTop > 48);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 48);
    };

    update();
    main.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(main);

    return () => {
      main.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, []);

  const scrollTo = (position: "top" | "bottom") => {
    const main = getScrollMain();
    if (!main) return;
    main.scrollTo({
      top: position === "top" ? 0 : main.scrollHeight,
      behavior: "smooth",
    });
  };

  if (!isScrollable) return null;

  return (
    <div
      className="fixed bottom-24 right-6 z-40 flex flex-col gap-2"
      data-dashboard-no-print
    >
      <ScrollButton
        label="Scroll to top"
        icon="vertical_align_top"
        disabled={!canScrollUp}
        onClick={() => scrollTo("top")}
      />
      <ScrollButton
        label="Scroll to bottom"
        icon="vertical_align_bottom"
        disabled={!canScrollDown}
        onClick={() => scrollTo("bottom")}
      />
    </div>
  );
}

function ScrollButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface shadow-lg transition-all hover:bg-surface-container-high active:scale-95 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surface-container-lowest"
    >
      <Icon name={icon} className="text-xl" />
    </button>
  );
}
