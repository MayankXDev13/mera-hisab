"use client";

import { useState } from "react";
import { useCustomers, useOutstanding, useOutstandings } from "@/lib/queries/customers";
import { useCreateCustomer, useUpdateCustomer } from "@/lib/mutations/customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { formatRupees, formatBps, formatDate } from "@/lib/utils/format";
import { toast } from "@/components/ui/toast";
import { TransactionForm } from "@/components/app/TransactionForm";
import { RepaymentDialog } from "@/components/app/RepaymentDialog";
import { RiAddLine, RiGroupLine, RiSearchLine, RiQuillPenLine } from "@remixicon/react";

function errMsg(e: unknown) {
  const err = e as { response?: { data?: { error?: string; details?: { fieldErrors?: Record<string, string[]> } } }; message?: string };
  if (err.response?.data?.error) {
    const fe = err.response?.data?.details?.fieldErrors;
    if (fe) return `${err.response.data.error}: ${Object.entries(fe).map(([k, v]) => `${k} ${v.join(",")}`).join(" | ")}`;
    return err.response.data.error;
  }
  return err.message || "Error";
}

export default function CustomersPage() {
  const { data, isLoading } = useCustomers();
  const outstandingMap = useOutstandings((data ?? []).map((c) => c.id));
  const [open, setOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [txnOpen, setTxnOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const [form, setForm] = useState<{ name: string; username: string; email: string; phone: string; notes: string; monthlyRateBps: number; status: "active" | "deactivated" }>({ name: "", username: "", email: "", phone: "", notes: "", monthlyRateBps: 250, status: "active" });
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = (data ?? []).filter((c) =>
    !search.trim() ? true : `${c.name} ${c.username} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const selected = data?.find((c) => c.id === drawerId) ?? null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await update.mutateAsync({ id: editing, data: { ...form, email: form.email || null, phone: form.phone || null, notes: form.notes || null } });
        toast.add({ title: "Customer updated", type: "success" });
        setEditing(null);
      } else {
        await create.mutateAsync({ ...form, email: form.email || null, phone: form.phone || null, notes: form.notes || null });
        toast.add({ title: "Customer created", type: "success" });
      }
      setForm({ name: "", username: "", email: "", phone: "", notes: "", monthlyRateBps: 250, status: "active" });
      setOpen(false);
    } catch (err) {
      toast.add({ title: "Failed", description: errMsg(err), type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.16em] uppercase font-medium text-muted-foreground">
            <span className="size-1 rounded-full bg-primary" />
            Khata
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-none mt-2">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">People you keep hisab with.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: "", username: "", email: "", phone: "", notes: "", monthlyRateBps: 250, status: "active" }); } }}>
          <DialogTrigger render={<Button className="rounded-full shadow-sm"><RiAddLine /> New customer</Button>} />
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
              <DialogDescription>{editing ? "Update details." : "Add a new khata. Username must be unique."}</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ramesh Kumar" /></div>
                <div className="space-y-2"><Label>Username *</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ramesh.kumar" pattern="^[a-zA-Z0-9_.-]+$" className="font-mono text-sm" /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ramesh@example.com" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 99999 99999" /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} placeholder="Optional note…" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Monthly rate</Label><Input type="number" min={0} max={10000} required value={form.monthlyRateBps} onChange={(e) => setForm({ ...form, monthlyRateBps: Number(e.target.value) })} /><span className="text-xs text-muted-foreground font-mono">{formatBps(form.monthlyRateBps)} per month</span></div>
                <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: (v ?? "active") as "active" | "deactivated" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem></SelectContent></Select></div>
              </div>
              <Button type="submit" className="w-full rounded-full h-10" disabled={create.isPending || update.isPending}>{editing ? "Save changes" : "Create customer"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-4 border-b bg-card">
          <div>
            <CardTitle className="text-[13px] flex items-center gap-2"><span className="size-7 rounded-lg bg-muted grid place-items-center"><RiGroupLine className="size-3.5" /></span> All customers</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Tap a row to view details and repayments.</p>
          </div>
          <div className="relative w-full max-w-[260px]">
            <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input placeholder="Search name or username" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 rounded-full bg-background" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-10 w-full rounded-xl" /></div>
          ) : !filtered.length ? (
            <div className="p-10 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-muted grid place-items-center"><RiGroupLine className="size-6 text-muted-foreground" /></div>
              <p className="text-sm font-medium mt-3">{search ? "No matches" : "No customers yet"}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[28ch] mx-auto">{search ? "Try a different search." : "Create your first khata to start recording."}</p>
              {!search && <Button onClick={() => setOpen(true)} size="sm" className="mt-4 rounded-full"><RiAddLine /> New customer</Button>}
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Name</TableHead>
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Username</TableHead>
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Rate</TableHead>
                    <TableHead className="text-right text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Outstanding</TableHead>
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground">Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer group" onClick={() => setDrawerId(c.id)}>
                      <TableCell className="font-medium text-sm group-hover:text-primary transition-colors">
                        <span className="inline-flex items-center gap-2">
                          <span className="size-7 rounded-full bg-muted text-muted-foreground grid place-items-center text-xs font-semibold shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          {c.name}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">@{c.username}</TableCell>
                      <TableCell className="font-mono text-xs">{formatBps(c.monthlyRateBps)}</TableCell>
                      <TableCell className="text-right">
                        {outstandingMap.isLoading ? (
                          <span className="text-muted-foreground text-xs">…</span>
                        ) : (
                          <span className={`font-mono text-sm font-medium ${(outstandingMap.data?.[c.id] ?? 0) > 0 ? "text-destructive" : (outstandingMap.data?.[c.id] ?? 0) < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                            {formatRupees(outstandingMap.data?.[c.id] ?? 0)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize rounded-full text-[11px]">{c.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(drawerId)} onOpenChange={(v) => !v && setDrawerId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto bg-card">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-3">
              <span className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center text-sm font-semibold shrink-0">
                {selected?.name.charAt(0).toUpperCase() ?? "?"}
              </span>
              {selected?.name ?? "Customer"}
            </SheetTitle>
            <SheetDescription className="font-mono text-xs">@{selected?.username} {selected?.email ? `• ${selected.email}` : ""} {selected?.phone ? `• ${selected.phone}` : ""}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-5 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <OutstandingBreakdown customerId={selected.id} onRecord={() => setRepayOpen(true)} />
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-medium">Monthly rate</div>
                    <div className="font-mono text-lg font-semibold mt-1">{formatBps(selected.monthlyRateBps)}</div>
                    <div className="text-xs text-muted-foreground">per month</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="rounded-full" onClick={() => setTxnOpen(true)}><RiQuillPenLine /> New entry</Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => {
                  setForm({ name: selected.name, username: selected.username, email: selected.email ?? "", phone: selected.phone ?? "", notes: selected.notes ?? "", monthlyRateBps: selected.monthlyRateBps, status: selected.status });
                  setEditing(selected.id);
                  setOpen(true);
                }}>Edit</Button>
              </div>

              {selected.notes && <div className="rounded-xl border bg-muted/20 p-4"><div className="text-[11px] tracking-[0.08em] uppercase text-muted-foreground font-medium mb-1">Notes</div><p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.notes}</p></div>}

              <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>New entry — {selected.name}</DialogTitle><DialogDescription>Record money given.</DialogDescription></DialogHeader>
                  <TransactionForm defaultCustomerId={selected.id} onDone={() => setTxnOpen(false)} />
                </DialogContent>
              </Dialog>

              <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Record repayment — {selected.name}</DialogTitle><DialogDescription>Money received back.</DialogDescription></DialogHeader>
                  <RepaymentContainer customerId={selected.id} customerName={selected.name} onDone={() => setRepayOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}


function OutstandingBreakdown({ customerId, onRecord }: { customerId: string; onRecord: () => void }) {
  const q = useOutstanding(customerId);
  if (q.isLoading) return <Skeleton className="h-[140px] w-full rounded-xl" />;
  if (q.error) return <div className="text-xs text-destructive">Failed to load</div>;
  const data = q.data;
  const positive = (data?.outstandingPaise ?? 0) > 0;
  return (
    <Card className={`${positive ? "border-destructive/15 bg-destructive/5 dark:bg-destructive/10" : "bg-muted/30"} overflow-hidden`}>
      <CardContent className="p-4">
        <div className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-medium">Outstanding</div>
        <div className={`font-mono text-lg font-semibold mt-1 ${positive ? "text-destructive" : ""}`}>{formatRupees(data?.outstandingPaise ?? 0)}</div>
        <div className="mt-3 space-y-1.5 max-h-[96px] overflow-auto pr-1">
          {(data?.sources ?? []).map((src) => (
            <div key={src.sourceId} className="flex items-center justify-between text-xs gap-2">
              <span className="truncate text-muted-foreground">{src.name}</span>
              <span className="font-mono font-medium shrink-0">{formatRupees(src.outstandingPaise)}</span>
            </div>
          ))}
          {!data?.sources.length && <p className="text-xs text-muted-foreground">No entries yet.</p>}
        </div>
        <Button size="sm" className="w-full mt-3 rounded-full" onClick={onRecord} disabled={(data?.outstandingPaise ?? 0) <= 0}>Record repayment</Button>
      </CardContent>
    </Card>
  );
}

function RepaymentContainer({ customerId, customerName, onDone }: { customerId: string; customerName: string; onDone: () => void }) {
  const q = useOutstanding(customerId);
  if (q.isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  return (
    <RepaymentDialog
      customerId={customerId}
      customerName={customerName}
      sources={q.data?.sources ?? []}
      totalOutstanding={q.data?.outstandingPaise ?? 0}
      onDone={onDone}
    />
  );
}
