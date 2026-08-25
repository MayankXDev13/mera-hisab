import clsx from "clsx";
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold tracking-widest uppercase text-muted">{label}</span>
    {children}
    {hint && !error && <span className="text-xs text-muted">{hint}</span>}
    {error && <span className="text-xs text-vermillion">{error}</span>}
  </label>;
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20", props.className)} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx("w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20", props.className)} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx("w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20", props.className)} />;
}
