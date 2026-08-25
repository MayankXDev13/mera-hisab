import clsx from "clsx";
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("bg-paper border border-line rounded-xl shadow-sm", className)}>{children}</div>;
}
export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4 border-b border-line/60 flex items-center justify-between", className)}>{children}</div>;
}
export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}
