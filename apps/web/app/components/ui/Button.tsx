import clsx from "clsx";
type Variant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass";
  const styles: Record<Variant, string> = {
    primary: "bg-indigo text-white hover:bg-indigo/90 shadow-sm",
    secondary: "bg-paper border border-line text-ink hover:bg-ink/[0.04]",
    ghost: "text-muted hover:text-ink hover:bg-ink/[0.04]",
    danger: "bg-vermillion text-white hover:bg-vermillion/90",
  };
  return (
    <button className={clsx(base, styles[variant], className)} {...props}>
      {children}
    </button>
  );
}
