export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-outline-variant bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-gutter py-6 text-xs text-on-surface-variant md:flex-row">
        <span>© 2024 Review Discovery Engine</span>
        <div className="flex gap-4">
          <span className="hover:text-primary transition-colors">Documentation</span>
          <span className="hover:text-primary transition-colors">Privacy</span>
          <span className="hover:text-primary transition-colors">Support</span>
        </div>
      </div>
    </footer>
  );
}
