import Icon from "@/components/ui/Icon";

interface AppHeaderProps {
  subtitle?: string;
}

export default function AppHeader({ subtitle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-gutter">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Icon name="insights" className="text-lg" filled />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-primary">
              Review Discovery Engine
            </span>
            {subtitle && (
              <p className="text-xs text-on-surface-variant">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
