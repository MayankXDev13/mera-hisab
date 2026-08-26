"use client";

import { useMemo, useState } from "react";
import { useAccounts } from "@/lib/queries/accounts";
import { useCards } from "@/lib/queries/cards";
import { useCustomers, useOutstandings } from "@/lib/queries/customers";
import { useTransactions } from "@/lib/queries/transactions";
import { HisabStrip } from "@/components/app/HisabStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupees, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import {
  RiArrowRightLine,
  RiWallet3Line,
  RiBankCardLine,
  RiGroupLine,
  RiBookOpenLine,
  RiExchangeLine,
} from "@remixicon/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/components/app/TransactionForm";

export default function DashboardPage() {
  const accounts = useAccounts();
  const cards = useCards();
  const customers = useCustomers();
  const tx = useTransactions({ page: 1, limit: 8 });
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => {
    if (!accounts.data || !cards.data) return { accounts: null, cards: null };
    const acc = accounts.data.reduce((s, a) => s + a.currentBalancePaise, 0);
    const cardAvail = cards.data.reduce(
      (s, c) => s + (c.availablePaise ?? c.totalLimitPaise - c.usedPaise),
      0,
    );
    return { accounts: acc, cards: cardAvail };
  }, [accounts.data, cards.data]);

  const outstandingMap = useOutstandings(
    (customers.data ?? []).map((c) => c.id),
  );
  const totalOutstanding = useMemo(() => {
    if (!customers.data || !outstandingMap.data) return null;
    if (outstandingMap.isLoading) return null;
    return Object.values(outstandingMap.data as Record<string, number>).reduce(
      (s, v) => s + v,
      0,
    );
  }, [customers.data, outstandingMap.data, outstandingMap.isLoading]);

  const customerMap = useMemo(
    () => new Map(customers.data?.map((c) => [c.id, c]) ?? []),
    [customers.data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight leading-none mt-2">
            Dashboard
          </h1>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="rounded-full shadow-sm hidden md:inline-flex"
        >
          <RiExchangeLine /> New entry
        </Button>
      </div>

      <HisabStrip
        totalOutstanding={totalOutstanding}
        totalAccounts={totals.accounts}
        totalCardsAvailable={totals.cards}
        onNewEntry={() => setOpen(true)}
      />
      {customers.data && (
        <p className="text-xs text-muted-foreground -mt-3">
          Tracking{" "}
          <span className="font-medium text-foreground">
            {customers.data.length}
          </span>{" "}
          {customers.data.length === 1 ? "customer" : "customers"}
          {totalOutstanding !== null && (
            <>
              {" "}
              · Outstanding{" "}
              <span className="font-mono font-medium text-foreground">
                {formatRupees(totalOutstanding)}
              </span>
            </>
          )}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="group overflow-hidden hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-xl bg-muted grid place-items-center">
                <RiWallet3Line className="size-4" />
              </span>
              <CardTitle className="text-[13px] tracking-tight">
                Accounts
              </CardTitle>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {accounts.data?.length ?? 0} total
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.isLoading ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : accounts.data?.length ? (
              <div className="space-y-2">
                {accounts.data.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border bg-background px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate leading-none">
                        {a.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground capitalize mt-0.5">
                        {a.type} • {a.status}
                      </div>
                    </div>
                    <span className="font-mono text-sm font-medium shrink-0 ml-3">
                      {formatRupees(a.currentBalancePaise)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
                <RiWallet3Line className="mx-auto size-5 text-muted-foreground" />
                <p className="text-sm font-medium mt-2">No accounts yet</p>
                <p className="text-xs text-muted-foreground">
                  Add where your money lives.
                </p>
              </div>
            )}
            <Button
              render={<Link href="/accounts" />}
              variant="ghost"
              size="sm"
              className="w-full justify-between rounded-full"
            >
              Manage accounts <RiArrowRightLine />
            </Button>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-xl bg-muted grid place-items-center">
                <RiBankCardLine className="size-4" />
              </span>
              <CardTitle className="text-[13px] tracking-tight">
                Cards
              </CardTitle>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {cards.data?.length ?? 0} total
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {cards.isLoading ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : cards.data?.length ? (
              <div className="space-y-2">
                {cards.data.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border bg-background px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.issuer}{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                          •• {c.last4}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Used {formatRupees(c.usedPaise)} of{" "}
                        {formatRupees(c.totalLimitPaise)}
                      </div>
                    </div>
                    <span className="font-mono text-xs font-medium shrink-0 ml-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full">
                      {formatRupees(
                        c.availablePaise ?? c.totalLimitPaise - c.usedPaise,
                      )}{" "}
                      left
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
                <RiBankCardLine className="mx-auto size-5 text-muted-foreground" />
                <p className="text-sm font-medium mt-2">No cards yet</p>
                <p className="text-xs text-muted-foreground">
                  Track limits and usage.
                </p>
              </div>
            )}
            <Button
              render={<Link href="/cards" />}
              variant="ghost"
              size="sm"
              className="w-full justify-between rounded-full"
            >
              Manage cards <RiArrowRightLine />
            </Button>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-xl bg-muted grid place-items-center">
                <RiGroupLine className="size-4" />
              </span>
              <CardTitle className="text-[13px] tracking-tight">
                Customers
              </CardTitle>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {customers.data?.length ?? 0} total
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {customers.isLoading ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : customers.data?.length ? (
              <div className="space-y-2">
                {customers.data.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border bg-background px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        @{c.username}
                      </div>
                    </div>
                    <Badge
                      variant={c.status === "active" ? "default" : "secondary"}
                      className="capitalize shrink-0 ml-2 rounded-full"
                    >
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
                <RiGroupLine className="mx-auto size-5 text-muted-foreground" />
                <p className="text-sm font-medium mt-2">No customers yet</p>
                <p className="text-xs text-muted-foreground">
                  Create your first khata.
                </p>
              </div>
            )}
            <Button
              render={<Link href="/customers" />}
              variant="ghost"
              size="sm"
              className="w-full justify-between rounded-full"
            >
              Manage customers <RiArrowRightLine />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between py-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <span className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center sm:grid">
              <RiBookOpenLine className="size-4" />
            </span>
            <div>
              <CardTitle className="text-[14px]">Recent entries</CardTitle>
              <p className="text-xs text-muted-foreground">
                Latest ledger lines
              </p>
            </div>
          </div>
          <Button
            render={<Link href="/transactions" />}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            View all
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {tx.isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ) : tx.data?.transactions.length ? (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">
                      Date
                    </TableHead>
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">
                      Customer
                    </TableHead>
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">
                      Type
                    </TableHead>
                    <TableHead className="text-right text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">
                      Note
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tx.data.transactions.map((t) => {
                    const cust = customerMap.get(t.customerId);
                    return (
                      <TableRow key={t.id} className="group">
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {formatDate(t.occurredAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium">
                            {cust?.name ?? t.customerId.slice(0, 8)}
                          </span>
                          {cust && (
                            <span className="text-muted-foreground font-mono text-xs ml-1.5">
                              @{cust.username}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium capitalize ring-1 ${t.direction === "debit" ? "bg-destructive/10 text-destructive ring-destructive/15" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/15"}`}
                          >
                            {t.direction === "debit" ? "Given" : "Received"}
                          </span>
                        </TableCell>
                        <TableCell
                          className={`font-mono text-sm text-right font-medium ${t.direction === "debit" ? "text-destructive" : "text-emerald-700 dark:text-emerald-300"}`}
                        >
                          {t.direction === "debit" ? "−" : "+"}
                          {formatRupees(t.amountPaise)}
                        </TableCell>
                        <TableCell
                          className="text-xs max-w-65 truncate text-muted-foreground"
                          title={t.note ?? ""}
                        >
                          {t.note ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-muted grid place-items-center">
                <RiBookOpenLine className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mt-3">No entries yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[28ch] mx-auto">
                Every hisab starts with a single line. Record your first debit.
              </p>
              <Button
                onClick={() => setOpen(true)}
                size="sm"
                className="mt-4 rounded-full"
              >
                New entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New ledger entry</DialogTitle>
            <DialogDescription>
              Record money given. Repayments are handled separately.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
