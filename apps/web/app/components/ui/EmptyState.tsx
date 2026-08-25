export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-paper/50 px-6 py-10 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-line/60 flex items-center justify-center text-muted">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
      </div>
      <div className="mt-3 font-semibold text-ink">{title}</div>
      <div className="mt-1 text-sm text-muted max-w-md mx-auto">{desc}</div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
