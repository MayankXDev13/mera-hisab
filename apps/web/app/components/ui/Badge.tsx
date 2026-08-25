import clsx from "clsx";
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral"|"success"|"danger"|"warning"|"info"|"indigo" }) {
  const map: Record<string,string> = {
    neutral: "bg-ink/5 text-ink border-ink/10",
    success: "bg-teal/10 text-teal border-teal/20",
    danger: "bg-vermillion/10 text-vermillion border-vermillion/20",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    info: "bg-indigo/10 text-indigo border-indigo/20",
    indigo: "bg-indigo text-white border-indigo",
  };
  return <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", map[tone])}>{children}</span>;
}
