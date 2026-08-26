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
import { TransactionForm } from "@/components/app/transaction-form";
import { RepaymentDialog } from "@/components/app/repayment-dialog";
import { RiAddLine } from "@remixicon/react";

function errMsg(e: unknown) {
  const err = e as { response?: { data?: { error?: string; details?: { fieldErrors?: Record<string, string[]> } } }; message?: string };
  if (err.response?.data?.error) {
    const fe = err.response?.data?.details?.fieldErrors;
    if (fe) return `${err.response.data.error}: ${Object.entries(fe).map(([k, v]) => `${k} ${v.join(",")}`).join(" | ")}`;
    return err.response.data.error;
  }
  return err.message || "Error";
}

function OutstandingCell({ id }: { id: string }) {
  const q = useOutstanding(id);
  if (q.isLoading) return <span className="text-muted-foreground">…</span>;
  if (q.error) return <span className="text-destructive text-xs">err</span>;
  const paise = q.data?.outstandingPaise ?? 0;
  return <span className={`font-mono text-sm ${paise > 0 ? "text-[oklch(0.55_0.2_25)]" : paise < 0 ? "text-[oklch(0.38_0.12_150)]" : ""}`}>{formatRupees(paise)}</span>;
}

function OutstandingBatchCells({ ids }: { ids: string[] }) {
  const q = useOutstandings(ids);
  if (q.isLoading) return <span className="text-muted-foreground">…</span>;
  return (
    <>
      {ids.map((id) => {
        const paise = (q.data as Record<string, number> | undefined)?.[id] ?? 0;
        return (
          <span key={id} className={`font-mono text-sm ${paise > 0 ? "text-[oklch(0.55_0.2_25)]" : paise < 0 ? "text-[oklch(0.38_0.12_150)]" : ""}`}>
            {formatRupees(paise)}
          </span>
        );
      })}
    </>
  );
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Customers</h1>
          <p className="text-sm text-muted-foreground">Khata customers • monthly rate in bps • outstanding = debits − credits</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: "", username: "", email: "", phone: "", notes: "", monthlyRateBps: 250, status: "active" }); } }}>
          <DialogTrigger render={<Button><RiAddLine /> New customer</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
              <DialogDescription>Username unique • rate 250 = 2.50% • phone optional</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ramesh Kumar" /></div>
                <div className="space-y-2"><Label>Username *</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ramesh.kumar" pattern="^[a-zA-Z0-9_.-]+$" /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ramesh@example.com" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+919999999999" /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} placeholder="Optional" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>Monthly rate bps</Label><Input type="number" min={0} max={10000} required value={form.monthlyRateBps} onChange={(e) => setForm({ ...form, monthlyRateBps: Number(e.target.value) })} /><span className="text-xs text-muted-foreground">{formatBps(form.monthlyRateBps)} / mo</span></div>
                <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: (v ?? "active") as "active" | "deactivated" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">active</SelectItem><SelectItem value="deactivated">deactivated</SelectItem></SelectContent></Select></div>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending || update.isPending}>{editing ? "Save" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">All customers</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : !data?.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No customers. Create the first khata.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDrawerId(c.id)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">@{c.username}</TableCell>
                    <TableCell className="font-mono text-xs">{formatBps(c.monthlyRateBps)}</TableCell>
                    <TableCell>
                      {outstandingMap.isLoading ? (
                        <span className="text-muted-foreground">…</span>
                      ) : (
                        <span className={`font-mono text-sm ${(outstandingMap.data?.[c.id] ?? 0) > 0 ? "text-[oklch(0.55_0.2_25)]" : (outstandingMap.data?.[c.id] ?? 0) < 0 ? "text-[oklch(0.38_0.12_150)]" : ""}`}>
                          {formatRupees(outstandingMap.data?.[c.id] ?? 0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">{c.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(drawerId)} onOpenChange={(v) => !v && setDrawerId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          <SheetHeader>
            <SheetTitle style={{ fontFamily: "var(--font-display)" }}>{selected?.name ?? "Customer"}</SheetTitle>
            <SheetDescription className="font-mono text-xs">@{selected?.username} • {selected?.email ?? "no email"} • {selected?.phone ?? ""}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <OutstandingBreakdown customerId={selected.id} onRecord={() => setRepayOpen(true)} />
                <Card>
                  <CardContent className="p-3">
                    <div className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Rate</div>
                    <div className="font-mono text-sm mt-1">{formatBps(selected.monthlyRateBps)} / mo</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => setTxnOpen(true)}>New entry for {selected.name.split(" ")[0]}</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setForm({ name: selected.name, username: selected.username, email: selected.email ?? "", phone: selected.phone ?? "", notes: selected.notes ?? "", monthlyRateBps: selected.monthlyRateBps, status: selected.status });
                  setEditing(selected.id);
                  setOpen(true);
                }}>Edit</Button>
              </div>

              {selected.notes && <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">{selected.notes}</p>}

              <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>New entry — {selected.name}</DialogTitle></DialogHeader>
                  <TransactionForm defaultCustomerId={selected.id} onDone={() => setTxnOpen(false)} />
                </DialogContent>
              </Dialog>

              <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Record repayment — {selected.name}</DialogTitle></DialogHeader>
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
  if (q.isLoading) return <Skeleton className="h-20 w-full" />;
  if (q.error) return <span className="text-destructive text-xs">err</span>;
  const data = q.data;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">Total outstanding</div>
        <div className="font-mono text-sm">{formatRupees(data?.outstandingPaise ?? 0)}</div>
      </div>
      <div className="space-y-1">
        {(data?.sources ?? []).map((src) => (
          <div key={src.sourceId} className="flex items-center justify-between text-xs">
            <span className="truncate text-muted-foreground">{src.name}</span>
            <span className="font-mono">{formatRupees(src.outstandingPaise)}</span>
          </div>
        ))}
        {!data?.sources.length && <p className="text-xs text-muted-foreground">No ledger activity yet.</p>}
      </div>
      <Button size="sm" className="w-full" onClick={onRecord} disabled={(data?.outstandingPaise ?? 0) <= 0}>Record repayment</Button>
    </div>
  );
}

function RepaymentContainer({ customerId, customerName, onDone }: { customerId: string; customerName: string; onDone: () => void }) {
  const q = useOutstanding(customerId);
  if (q.isLoading) return <Skeleton className="h-24 w-full" />;
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
