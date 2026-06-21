import Link from "next/link";
import { PLATFORM_NAME } from "@/lib/brand";
import Icon from "@/components/ui/Icon";
import AppNav from "./AppNav";

interface AppHeaderProps {
  subtitle?: string;
  activeNav?: string;
}

export default function AppHeader({ subtitle, activeNav }: AppHeaderProps) {
  const isHome = activeNav === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Icon
              name="analytics"
              className="text-primary md:hidden"
              filled
            />
            <div className="min-w-0">
              <span className="truncate text-sm font-bold text-on-surface md:text-base">
                {PLATFORM_NAME}
              </span>
              {(subtitle || isHome) && (
                <p className="text-xs text-on-surface-variant">
                  {isHome ? "Spotify reviews only" : subtitle}
                </p>
              )}
            </div>
          </Link>
          {isHome && (
            <div className="hidden md:block">
              <AppNav active={activeNav} variant="inline" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isHome ? (
            <Link
              href="/"
              className="rounded-xl bg-primary px-4 py-1.5 text-xs font-medium text-on-primary transition-all hover:opacity-90 active:opacity-80"
            >
              New analysis
            </Link>
          ) : (
            <AppNav active={activeNav} />
          )}
        </div>
      </div>
    </header>
  );
}
