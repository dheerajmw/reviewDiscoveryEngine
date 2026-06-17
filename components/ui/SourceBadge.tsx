import Icon from "./Icon";

const SOURCE_CONFIG: Record<
  string,
  { label: string; icon: string }
> = {
  reddit: { label: "Reddit", icon: "forum" },
  playstore: { label: "Play Store", icon: "shop_two" },
  appstore: { label: "App Store", icon: "shop_two" },
  spotify: { label: "Spotify", icon: "podcasts" },
};

interface SourceBadgeProps {
  source: string;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const key = source.toLowerCase();
  const config = SOURCE_CONFIG[key] ?? {
    label: source,
    icon: "source",
  };

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-primary bg-primary/10">
      <Icon name={config.icon} className="text-xs" />
      {config.label}
    </span>
  );
}
