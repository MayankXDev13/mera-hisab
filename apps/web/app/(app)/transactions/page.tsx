"use client";

import { useState } from "react";
import { useTransactions, type TransactionFilters } from "@/lib/queries/transactions";
import { useCustomers } from "@/lib/queries/customers";
import { useAccounts } from "@/lib/queries/accounts";
import { useCards } from "@/lib/queries/cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { formatRupees, formatDate } from "@/lib/utils/format";
import { TransactionForm } from "@/components/app/transaction-form";
import { toast } from "@/components/ui/toast";
import { RiAddLine } from "@remixicon/react";

function errMsg(e: unknown) {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err.response?.data?.error || err.message || "Error";
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 20 });
  const tx = useTransactions(filters);
  const customers = useCustomers();
  const accounts = useAccounts();
  const cards = useCards();
  const [open, setOpen] = useState(false);

  const customerMap = new Map(customers.data?.map((c) => [c.id, c.name]) ?? []);
  const accountMap = new Map(accounts.data?.map((a) => [a.id, a.name]) ?? []);
  const cardMap = new Map(cards.data?.map((c) => [c.id, `${c.issuer} ••${c.last4}`]) ?? []);

  const totalPages = tx.data ? Math.max(1, Math.ceil(tx.data.total / tx.data.limit)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ledger</h1>
          <p className="text-sm text-muted-foreground">All your transaction entries.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><RiAddLine /> New entry</Button>} />
          <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle>New ledger entry</DialogTitle><DialogDescription>Record a new debit or credit entry.</DialogDescription></DialogHeader>
            <TransactionForm onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={filters.customerId ?? "all"} onValueChange={(v) => setFilters({ ...filters, customerId: v === "all" ? undefined : (v as string), page: 1 })}>
              <SelectTrigger><SelectValue placeholder="All customers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customers.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={filters.direction ?? "all"} onValueChange={(v) => setFilters({ ...filters, direction: v === "all" ? undefined : (v as "debit" | "credit"), page: 1 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Both</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Source type</Label>
            <Select value={filters.sourceType ?? "all"} onValueChange={(v) => setFilters({ ...filters, sourceType: v === "all" ? undefined : (v as "account" | "credit_card"), sourceId: undefined, page: 1 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Both</SelectItem>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="credit_card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>From</Label>
            <Input type="date" value={filters.from ? filters.from.slice(0, 10) : ""} onChange={(e) => setFilters({ ...filters, from: e.target.value ? new Date(e.target.value).toISOString() : undefined, page: 1 })} />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input type="date" value={filters.to ? filters.to.slice(0, 10) : ""} onChange={(e) => setFilters({ ...filters, to: e.target.value ? new Date(e.target.value).toISOString() : undefined, page: 1 })} />
          </div>
          <div className="space-y-2">
            <Label>Per page</Label>
            <Select value={String(filters.limit ?? 20)} onValueChange={(v) => setFilters({ ...filters, limit: Number(v ?? 20), page: 1 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 lg:col-span-6 flex gap-2">
            <Button variant="outline" onClick={() => setFilters({ page: 1, limit: 20 })}>Clear filters</Button>
            <span className="text-xs text-muted-foreground self-center">Total {tx.data?.total ?? "—"} • Page {tx.data?.page ?? filters.page} / {totalPages}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Transactions</CardTitle>
          {tx.isFetching && <span className="text-xs text-muted-foreground">Refreshing…</span>}
        </CardHeader>
        <CardContent className="p-0">
          {tx.isLoading ? (
            <div className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : tx.error ? (
            <div className="p-8 text-center text-sm text-destructive">Failed: {errMsg(tx.error)}</div>
          ) : !tx.data?.transactions.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No transactions for current filters.</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Dir</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tx.data.transactions.map((t) => {
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(t.occurredAt)}</TableCell>
                        <TableCell className="text-xs">{customerMap.get(t.customerId) ?? t.customerId.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant={t.direction === "debit" ? "destructive" : "default"} className="capitalize text-[11px]">
                            {t.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-mono text-sm ${t.direction === "debit" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {t.direction === "debit" ? "−" : "+"}{formatRupees(t.amountPaise)}
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate">
                          {accountMap.get(t.sourceId ?? "") ?? cardMap.get(t.sourceId ?? "") ?? (t.sourceId ? t.sourceId.slice(0, 8) : "repayment")}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={t.note ?? ""}>{t.note ?? "—"}</TableCell>

                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {tx.data && totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <Button variant="outline" size="sm" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) - 1 })}>Previous</Button>
              <span className="text-xs text-muted-foreground">Page {filters.page} of {totalPages} • {tx.data.total} total</span>
              <Button variant="outline" size="sm" disabled={(filters.page ?? 1) >= totalPages} onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
