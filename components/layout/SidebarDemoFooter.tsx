"use client";

import { useEffect, useState } from "react";
import DemoModeAlert from "./DemoModeAlert";
import Icon from "@/components/ui/Icon";

interface SidebarDemoFooterProps {
  /** Run used mock classifier or chat fallback for this session. */
  runDemoMode?: boolean;
}

export default function SidebarDemoFooter({
  runDemoMode = false,
}: SidebarDemoFooterProps) {
  const [envDemoMode, setEnvDemoMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/classify/config")
      .then((res) => res.json())
      .then((data: { mockEnabled?: boolean }) => {
        setEnvDemoMode(Boolean(data.mockEnabled));
      })
      .catch(() => setEnvDemoMode(false))
      .finally(() => setLoaded(true));
  }, []);

  const demoActive = envDemoMode || runDemoMode;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-on-surface">Demo mode</p>
            <p className="text-[10px] text-on-surface-variant">
              Off · locked for users
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={false}
              aria-label="Demo mode (locked off)"
              disabled
              title="Demo mode is controlled by server configuration"
              className="relative h-5 w-9 shrink-0 cursor-not-allowed rounded-full bg-outline-variant opacity-80"
            >
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface-container-lowest shadow-sm" />
            </button>
            <Icon name="lock" className="text-sm text-outline" />
          </div>
        </div>
      </div>

      {loaded && demoActive && <DemoModeAlert compact />}
    </div>
  );
}
