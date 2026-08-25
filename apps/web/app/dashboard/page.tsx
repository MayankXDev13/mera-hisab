"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees } from "../../lib/money";
import { StatCard } from "../components/ui/StatCard";
import { Card, CardHeader } from "../components/ui/Card";
import { LedgerTable, Th, Td } from "../components/ui/LedgerTable";
import { EmptyState } from "../components/ui/EmptyState";
import Link from "next/link";

type Dashboard = {
  totals: { totalDisbursed: number; totalReceived: number; totalCharges: number; totalWaived: number; outstanding: number };
  accounts: { id: string; name: string; currentBalancePaise: number }[];
  cards: { id: string; issuer: string; last4: string; totalLimitPaise: number; usedPaise: number; availablePaise: number }[];
  customers: { id: string; name: string; username: string; outstandingPaise: number }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch(`${API_URL}/api/v1/dashboard`, { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error("Failed to load dashboard"); return r.json(); })
      .then(setData).catch((e) => setErr(String(e.message ?? e)));
  }, []);
  if (err) return <div className="rounded-xl border border-vermillion/20 bg-vermillion/5 p-6 text-sm text-vermillion">{err}</div>;
  if (!data) return <div className="space-y-4 animate-pulse"><div className="h-28 rounded-xl bg-line/30" /><div className="h-64 rounded-xl bg-line/20" /></div>;
  const d = data;
  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="display text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Where you stand. Every figure ties back to a transaction or charge.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard label="Disbursed" value={formatRupees(d.totals.totalDisbursed)} accent="vermillion" className="stagger-1" />
        <StatCard label="Received" value={formatRupees(d.totals.totalReceived)} accent="teal" className="stagger-2" />
        <StatCard label="Charges" value={formatRupees(d.totals.totalCharges)} accent="indigo" className="stagger-3" />
        <StatCard label="Waived" value={formatRupees(d.totals.totalWaived)} className="stagger-4" />
        <StatCard label="Outstanding" value={formatRupees(d.totals.outstanding)} accent="brass" featured sub="What customers owe right now" className="stagger-5" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-sm tracking-wide">Accounts</h2>
            <Link href="/accounts" className="text-xs text-indigo hover:underline underline-offset-4">Manage</Link>
          </CardHeader>
          {d.accounts.length === 0 ? <div className="p-6"><EmptyState title="No accounts yet" desc="Add a savings or current account to start lending from it." /></div> : (
            <LedgerTable className="border-0 rounded-none">
              <thead><tr><Th>Name</Th><Th align="right">Balance</Th></tr></thead>
              <tbody>
                {d.accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-ink/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    <Td>{a.name}</Td>
                    <Td align="right" className="amount font-medium">{formatRupees(a.currentBalancePaise)}</Td>
                  </tr>
                ))}
              </tbody>
            </LedgerTable>
          )}
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-sm tracking-wide">Cards</h2>
            <Link href="/cards" className="text-xs text-indigo hover:underline underline-offset-4">Manage</Link>
          </CardHeader>
          {d.cards.length === 0 ? <div className="p-6"><EmptyState title="No cards added" desc="Add a credit card to track used limit and available headroom." /></div> : (
            <div className="divide-y divide-line/60">
              {d.cards.map((c) => {
                const pct = c.totalLimitPaise ? (c.usedPaise / c.totalLimitPaise) * 100 : 0;
                return (
                  <div key={c.id} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{c.issuer} <span className="amount text-muted">···· {c.last4}</span></div>
                      <span className="amount text-xs text-muted">{formatRupees(c.availablePaise)} available</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
                      <div className="h-full bg-indigo rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-muted">
                      <span className="amount">{formatRupees(c.usedPaise)} used</span>
                      <span className="amount">{formatRupees(c.totalLimitPaise)} limit</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-sm tracking-wide">Customers by outstanding</h2>
          <Link href="/customers" className="text-xs text-indigo hover:underline underline-offset-4">View all</Link>
        </CardHeader>
        {d.customers.length === 0 ? <div className="p-6"><EmptyState title="No customers" desc="Add a borrower to start recording disbursements." /></div> : (
          <LedgerTable className="border-0 rounded-none rounded-b-xl overflow-hidden">
            <thead><tr><Th>Customer</Th><Th align="right">Outstanding</Th><Th align="right"></Th></tr></thead>
            <tbody>
              {d.customers.map((c) => (
                <tr key={c.id} className="hover:bg-ink/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                  <Td>
                    <Link href={`/customers/${c.id}`} className="font-medium hover:text-indigo hover:underline underline-offset-4">{c.name}</Link>
                    <span className="text-muted ml-2 text-xs">@{c.username}</span>
                  </Td>
                  <Td align="right" className="amount font-semibold">{formatRupees(c.outstandingPaise)}</Td>
                  <Td align="right"><Link href={`/customers/${c.id}`} className="text-xs text-indigo hover:underline">View</Link></Td>
                </tr>
              ))}
            </tbody>
          </LedgerTable>
        )}
      </Card>
    </div>
  );
}
