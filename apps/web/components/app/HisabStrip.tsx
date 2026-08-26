import { Card, CardContent } from "@/components/ui/card";
import { formatRupees } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { RiAddLine, RiMoneyRupeeCircleLine, RiBankCardLine, RiWallet3Line } from "@remixicon/react";
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
  const hasData = totalOutstanding !== null || totalAccounts !== null || totalCardsAvailable !== null;

  return (
    <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr_1fr] items-stretch">
      <Card className="bg-primary text-primary-foreground overflow-hidden relative border-0 shadow-sm">
        <div className="absolute inset-0 opacity-[0.08]" aria-hidden>
          <div className="absolute -right-12 -top-12 size-40 rounded-full border border-white" />
          <div className="absolute -right-6 -top-6 size-24 rounded-full border border-white/60" />
          <div className="absolute right-10 bottom-0 text-[96px] leading-none font-bold opacity-10 select-none">₹</div>
        </div>
        <CardContent className="p-5 md:p-6 relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase font-medium backdrop-blur">
                <span className="size-1.5 rounded-full bg-primary-foreground/60 animate-pulse" />
                Total outstanding
              </div>
              <div
                className="text-[28px] md:text-[32px] font-semibold leading-none mt-3 tracking-tight"
              >
                {totalOutstanding === null ? <span className="opacity-60">—</span> : formatRupees(totalOutstanding)}
              </div>
              <div className="text-xs opacity-70 mt-1.5">What customers owe you • Denā</div>
            </div>
            <div className="hidden sm:grid size-10 place-items-center rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15 shrink-0">
              <RiMoneyRupeeCircleLine className="size-5 opacity-90" />
            </div>
          </div>
          <div className="h-px bg-primary-foreground/20 mt-4" />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] tracking-wide opacity-60">Updated live from ledger</span>
            {onNewEntry ? (
              <Button onClick={onNewEntry} size="sm" variant="secondary" className="rounded-full h-7 bg-white text-primary hover:bg-white/90 font-medium shadow-sm">
                <RiAddLine /> New entry
              </Button>
            ) : (
              <Button render={<Link href="/transactions" />} size="sm" variant="secondary" className="rounded-full h-7 bg-white text-primary hover:bg-white/90 font-medium shadow-sm">
                <RiAddLine /> New entry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-muted-foreground font-medium">
            <span className="size-6 rounded-lg bg-muted grid place-items-center"><RiWallet3Line className="size-3.5" /></span>
            Accounts balance
          </div>
          <div className="font-mono text-[20px] font-semibold mt-3 tracking-tight leading-none">
            {totalAccounts === null ? <span className="text-muted-foreground text-base font-normal">—</span> : formatRupees(totalAccounts)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Across all funding accounts</div>
          <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-3/5 bg-primary/20" />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-muted-foreground font-medium">
            <span className="size-6 rounded-lg bg-muted grid place-items-center"><RiBankCardLine className="size-3.5" /></span>
            Cards available
          </div>
          <div className="font-mono text-[20px] font-semibold mt-3 tracking-tight leading-none">
            {totalCardsAvailable === null ? <span className="text-muted-foreground text-base font-normal">—</span> : formatRupees(totalCardsAvailable)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Total limit minus used</div>
          <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-2/5 bg-primary/30" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
