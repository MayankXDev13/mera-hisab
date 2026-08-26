import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

export function StatCard({
  eyebrow,
  value,
  hint,
  icon,
}: {
  eyebrow: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground font-medium flex items-center gap-2">
          {icon}
          {eyebrow}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}
