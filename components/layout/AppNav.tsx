import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { NEW_ANALYSIS_HREF } from "./NewAnalysisLink";

const NAV_ITEMS = [
  { href: NEW_ANALYSIS_HREF, label: "New Analysis", icon: "upload_file" },
  { href: "/history", label: "Research Repository", icon: "history" },
  { href: "/runs/compare", label: "Compare Runs", icon: "compare" },
] as const;

interface AppNavProps {
  active?: string;
  variant?: "default" | "inline";
}

export default function AppNav({ active, variant = "default" }: AppNavProps) {
  if (variant === "inline") {
    return (
      <nav className="flex items-center gap-4">
        {NAV_ITEMS.filter((item) => item.href !== NEW_ANALYSIS_HREF).map((item) => {
          const isActive = active === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors duration-200 ${
                isActive
                  ? "border-b-2 border-primary pb-1 font-medium text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            <Icon name={item.icon} className="text-base" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
