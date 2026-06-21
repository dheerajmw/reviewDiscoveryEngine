export default function ImportDivider() {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="h-px flex-1 bg-outline-variant" />
      <span className="whitespace-nowrap text-xs font-bold uppercase tracking-widest text-outline">
        Or Import Existing Data
      </span>
      <div className="h-px flex-1 bg-outline-variant" />
    </div>
  );
}
