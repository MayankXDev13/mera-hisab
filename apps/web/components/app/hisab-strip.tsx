import { Card, CardContent } from "@/components/ui/card";
import { formatRupees } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { RiAddLine } from "@remixicon/react";
import Link from "next/link";

export function HisabStrip({
  totalOutstanding,
  totalAccounts,
  totalCardsAvailable,
  onNewEntry,
}: {
  totalOutstanding: number | null;
  totalAccounts: number | null;
  totalCardsAvailable: number | null;
  onNewEntry?: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_auto] items-stretch">
      <Card className="bg-primary text-primary-foreground border-primary overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 size-32 rounded-full border border-primary-foreground/30" />
          <div className="absolute -right-4 -top-4 size-20 rounded-full border border-primary-foreground/20" />
        </div>
        <CardContent className="p-4 relative">
          <div className="text-[11px] tracking-[0.14em] uppercase opacity-80">Total Outstanding • Denā</div>
          <div className="font-display text-2xl font-semibold mt-1 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            {totalOutstanding === null ? "—" : formatRupees(totalOutstanding)}
          </div>
          <div className="text-xs opacity-80 mt-1">Debits − Credits across all customers</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Accounts Balance</div>
          <div className="font-mono text-lg font-medium mt-1">{totalAccounts === null ? "—" : formatRupees(totalAccounts)}</div>
          <div className="text-xs text-muted-foreground">Current • Savings</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Cards Available</div>
          <div className="font-mono text-lg font-medium mt-1">{totalCardsAvailable === null ? "—" : formatRupees(totalCardsAvailable)}</div>
          <div className="text-xs text-muted-foreground">Total limit − Used</div>
        </CardContent>
      </Card>

      <div className="flex items-center">
        {onNewEntry ? (
          <Button onClick={onNewEntry} size="lg" className="w-full md:w-auto">
            <RiAddLine /> New entry
          </Button>
        ) : (
          <Button render={<Link href="/transactions" />} size="lg" className="w-full md:w-auto">
            <RiAddLine /> New entry
          </Button>
        )}
      </div>
    </div>
  );
}
