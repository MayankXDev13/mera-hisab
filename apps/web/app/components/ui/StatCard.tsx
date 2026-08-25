import clsx from "clsx";
export function StatCard({ label, value, sub, accent, featured, className }: { label: string; value: string; sub?: string; accent?: "brass"|"teal"|"vermillion"|"indigo"; featured?: boolean; className?: string }) {
  const accentLine = accent === "brass" ? "bg-brass" : accent === "teal" ? "bg-teal" : accent === "vermillion" ? "bg-vermillion" : accent === "indigo" ? "bg-indigo" : "bg-line";
  return (
    <div className={clsx("rounded-xl border bg-paper p-4 md:p-5 flex flex-col gap-3 motion-safe:animate-enter", featured ? "border-brass/40 shadow-sm" : "border-line shadow-sm", className)}>
      <div className="text-[11px] tracking-widest uppercase text-muted font-medium">{label}</div>
      <div className={clsx("display font-bold tracking-tight", featured ? "text-2xl md:text-[28px] leading-none" : "text-xl md:text-2xl")}>
        <span className="amount">{value}</span>
      </div>
      {featured && <div className={clsx("h-[2px] w-12 rounded-full", accentLine)} />}
      {sub && <div className="text-xs text-muted">{sub}</div>}
      {!featured && <div className={clsx("h-px w-full mt-1", accentLine, "opacity-60")} />}
    </div>
  );
}
