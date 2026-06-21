import Icon from "./Icon";

const SOURCE_CONFIG: Record<
  string,
  { label: string; icon: string }
> = {
  reddit: { label: "Reddit", icon: "forum" },
  playstore: { label: "Play Store", icon: "shop_two" },
  appstore: { label: "App Store", icon: "shop_two" },
  spotify: { label: "Spotify", icon: "podcasts" },
  "spotify-community": { label: "Spotify Community", icon: "groups" },
  "social-media": { label: "Social", icon: "share" },
  unknown: { label: "Unknown", icon: "help" },
};

function formatSourceLabel(source: string): string {
  const key = source.toLowerCase().replace(/\s+/g, "");
  const config = SOURCE_CONFIG[key];
  if (config) return config.label;

  if (source.length > 24) {
    return `${source.slice(0, 24)}…`;
  }

  return source;
}

interface SourceBadgeProps {
  source: string;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const key = source.toLowerCase().replace(/\s+/g, "");
  const config = SOURCE_CONFIG[key] ?? {
    label: formatSourceLabel(source),
    icon: "source",
  };

  return (
    <span
      className="inline-flex max-w-full items-center gap-1 truncate rounded bg-primary/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-primary"
      title={source}
    >
      <Icon name={config.icon} className="shrink-0 text-xs" />
      <span className="truncate">{config.label}</span>
    </span>
  );
}
