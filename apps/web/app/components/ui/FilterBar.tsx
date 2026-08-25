export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border border-line bg-paper/60">{children}</div>;
}
