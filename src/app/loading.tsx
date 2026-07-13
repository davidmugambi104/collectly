export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 rounded-full border-2 border-ink-200 border-t-brand-600 animate-spin" />
        <p className="mt-3 text-sm text-ink-500">Loading…</p>
      </div>
    </div>
  );
}
