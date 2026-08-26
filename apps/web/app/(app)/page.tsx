"use client";

import { useMemo, useState } from "react";
import { useAccounts } from "@/lib/queries/accounts";
import { useCards } from "@/lib/queries/cards";
import { useCustomers, useOutstandings } from "@/lib/queries/customers";
import { useTransactions } from "@/lib/queries/transactions";
import { HisabStrip } from "@/components/app/hisab-strip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupees, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { RiArrowRightLine } from "@remixicon/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/app/transaction-form";

export default function DashboardPage() {
  const accounts = useAccounts();
  const cards = useCards();
  const customers = useCustomers();
  const tx = useTransactions({ page: 1, limit: 10 });
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => {
    if (!accounts.data || !cards.data) return { accounts: null, cards: null };
    const acc = accounts.data.reduce((s, a) => s + a.currentBalancePaise, 0);
    const cardAvail = cards.data.reduce((s, c) => s + (c.availablePaise ?? c.totalLimitPaise - c.usedPaise), 0);
    return { accounts: acc, cards: cardAvail };
  }, [accounts.data, cards.data]);

  // batch outstanding for dashboard — one request for all customers
  const outstandingMap = useOutstandings((customers.data ?? []).map((c) => c.id));
  const totalOutstanding = useMemo(() => {
    if (!customers.data || !outstandingMap.data) return null;
    // if still loading, keep null until ready
    if (outstandingMap.isLoading) return null;
    return Object.values(outstandingMap.data as Record<string, number>).reduce((s, v) => s + v, 0);
  }, [customers.data, outstandingMap.data, outstandingMap.isLoading]);

  const outstandingHint = customers.data ? `${customers.data.length} customers` : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Khata at a glance — balances, limits, recent ledger.</p>
      </div>

      <HisabStrip
        totalOutstanding={totalOutstanding}
        totalAccounts={totals.accounts}
        totalCardsAvailable={totals.cards}
        onNewEntry={() => setOpen(true)}
      />
      {outstandingHint && <p className="text-xs text-muted-foreground -mt-3">Customers tracked: {outstandingHint}{totalOutstanding !== null ? ` • total outstanding ${formatRupees(totalOutstanding)}` : ""} </p>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {accounts.isLoading ? <Skeleton className="h-20 w-full" /> : accounts.data?.length ? (
              accounts.data.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{a.name} <Badge variant="outline" className="ml-1 capitalize">{a.type}</Badge></span>
                  <span className="font-mono">{formatRupees(a.currentBalancePaise)}</span>
                </div>
              ))
            ) : <p className="text-sm text-muted-foreground">No accounts yet.</p>}
            <Button render={<Link href="/accounts" />} variant="ghost" size="sm" className="w-full">
              Manage accounts <RiArrowRightLine />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cards.isLoading ? <Skeleton className="h-20 w-full" /> : cards.data?.length ? (
              cards.data.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.issuer} •• {c.last4}</span>
                  <span className="font-mono text-xs">{formatRupees(c.availablePaise)} avail</span>
                </div>
              ))
            ) : <p className="text-sm text-muted-foreground">No cards yet.</p>}
            <Button render={<Link href="/cards" />} variant="ghost" size="sm" className="w-full">
              Manage cards <RiArrowRightLine />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customers.isLoading ? <Skeleton className="h-20 w-full" /> : customers.data?.length ? (
              customers.data.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.name} <span className="text-muted-foreground">@{c.username}</span></span>
                  <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">{c.status}</Badge>
                </div>
              ))
            ) : <p className="text-sm text-muted-foreground">No customers yet.</p>}
            <Button render={<Link href="/customers" />} variant="ghost" size="sm" className="w-full">
              Manage customers <RiArrowRightLine />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Recent Ledger</CardTitle>
          <Button render={<Link href="/transactions" />} variant="outline" size="sm">
            View all
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {tx.isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" />
            </div>
          ) : tx.data?.transactions.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Dir</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tx.data.transactions.map((t) => (
                  <TableRow key={t.id} className="perforated">
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(t.occurredAt)}</TableCell>
                    <TableCell>
                      <Badge variant={t.direction === "debit" ? "destructive" : "default"} className="capitalize text-[11px]">{t.direction}</Badge>
                    </TableCell>
                    <TableCell className={`font-mono text-sm ${t.direction === "debit" ? "text-[oklch(0.55_0.2_25)]" : "text-[oklch(0.38_0.12_150)]"}`}>
                      {t.direction === "debit" ? "−" : "+"}{formatRupees(t.amountPaise)}
                    </TableCell>
                                        <TableCell className="text-xs max-w-[220px] truncate">{t.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">No entries yet. Create your first hisab.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New ledger entry</DialogTitle>
            <DialogDescription>Single rupee input → paise. Debit = give, Credit = receive.</DialogDescription>
          </DialogHeader>
          <TransactionForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
