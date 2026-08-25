import clsx from "clsx";
export function LedgerTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("overflow-x-auto scrollbar-thin rounded-xl border border-line bg-paper shadow-sm", className)}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}
export function Th({ children, className, align="left" }: { children?: React.ReactNode; className?: string; align?: "left"|"right"|"center" }) {
  return <th className={clsx("px-4 py-3 text-xs font-semibold tracking-widest uppercase text-muted bg-paper/80 backdrop-blur border-b border-line whitespace-nowrap", align==="right"?"text-right":align==="center"?"text-center":"text-left", className)}>{children}</th>;
}
export function Td({ children, className, align="left", colSpan }: { children?: React.ReactNode; className?: string; align?: "left"|"right"|"center"; colSpan?: number }) {
  return <td colSpan={colSpan} className={clsx("px-4 py-3 border-b border-line/60 align-middle", align==="right"?"text-right":align==="center"?"text-center":"text-left", className)}>{children}</td>;
}
