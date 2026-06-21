import Icon from "@/components/ui/Icon";
import ReviewVolumeGuidance from "./ReviewVolumeGuidance";

export default function FetchHeroIntro() {
  return (
    <aside className="stitch-hero-aside relative text-center md:text-left">
      <div
        aria-hidden
        className="hero-ambient-glow animate-hero-orb absolute -left-20 -top-20 h-64 w-64 bg-primary blur-[100px]"
      />
      <div
        aria-hidden
        className="hero-ambient-glow animate-hero-orb absolute -bottom-10 -right-10 h-48 w-48 bg-secondary-container blur-[80px]"
        style={{ animationDelay: "-4s" }}
      />

      <div className="relative">
        <div className="animate-fade-in-up mb-4 flex items-center justify-center gap-2 stagger-1 md:justify-start">
          <div className="animate-hero-float rounded-full bg-primary-fixed p-2">
            <Icon name="podcasts" className="text-2xl text-primary" />
          </div>
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            Spotify Discovery Engine
          </span>
        </div>

        <h1 className="hero-title-shimmer animate-fade-in-up mb-6 text-[2rem] font-semibold leading-tight tracking-tight stagger-2 sm:text-[2rem]">
          Fetch &amp; analyze
          <br />
          Spotify reviews only.
        </h1>

        <p className="animate-fade-in-up mx-auto mb-10 max-w-md text-base leading-relaxed text-on-surface-variant stagger-3 md:mx-0">
          Live fetch and analysis for the Spotify app — Google Play, App Store,
          Reddit, and Spotify Community — focused on music discovery and
          recommendations.
        </p>

        <ul className="animate-fade-in-up space-y-4 stagger-4">
          <li className="flex items-center justify-center gap-4 md:justify-start">
            <span className="rounded-lg bg-primary-fixed p-1.5">
              <Icon name="podcasts" className="text-xl text-primary" />
            </span>
            <span className="text-base font-medium text-on-surface">
              Spotify app reviews only
            </span>
          </li>
          <li className="flex items-center justify-center gap-4 md:justify-start">
            <span className="rounded-lg bg-primary-fixed p-1.5">
              <Icon name="database" className="text-xl text-primary" />
            </span>
            <span className="text-base font-medium text-on-surface">
              Multi-source discovery corpus
            </span>
          </li>
          <li className="flex items-center justify-center gap-4 md:justify-start">
            <span className="rounded-lg bg-primary-fixed p-1.5">
              <Icon name="bolt" className="text-xl text-primary" />
            </span>
            <span className="text-base font-medium text-on-surface">
              Live fetch from public sources
            </span>
          </li>
        </ul>

        <div className="mt-8">
          <ReviewVolumeGuidance variant="hero" />
        </div>
      </div>
    </aside>
  );
}
