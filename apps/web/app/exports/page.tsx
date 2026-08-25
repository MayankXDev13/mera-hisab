"use client";
import { API_URL } from "../../lib/api";
import { Card, CardBody } from "../components/ui/Card";
import Link from "next/link";

export default function ExportsPage(){
  const items=[
    { href: `${API_URL}/api/v1/exports/transactions.csv`, title: "Transactions CSV", desc: "Every debit and credit with customer, source, amount and date. Filter by customer and date in the API if needed." },
    { href: `${API_URL}/api/v1/exports/customers.csv`, title: "Customers CSV", desc: "All borrowers with rates and outstanding. Use for backup or sharing with your CA." },
    { href: `${API_URL}/api/v1/exports/charges.csv`, title: "Charges CSV", desc: "Monthly charges with month, rate snapshot, base and waived amount." },
  ];
  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="display text-2xl md:text-3xl font-bold tracking-tight">Exports</h1>
        <p className="text-sm text-muted mt-1">CSV for your CA and backups. PDF statements live on each customer page.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {items.map(it=> (
          <Card key={it.href} className="flex flex-col">
            <CardBody className="flex-1">
              <h2 className="font-semibold">{it.title}</h2>
              <p className="mt-2 text-sm text-muted leading-relaxed">{it.desc}</p>
              <a href={it.href} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo text-white px-4 py-2 text-sm font-medium hover:bg-indigo/90">
                Download
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/></svg>
              </a>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardBody>
          <h3 className="font-semibold text-sm">PDF statements</h3>
          <p className="mt-1 text-sm text-muted">Open any customer to download a PDF with transactions, charges and running balance for handing to the borrower.</p>
          <Link href="/customers" className="mt-3 inline-flex text-sm text-indigo hover:underline underline-offset-4">Go to customers →</Link>
        </CardBody>
      </Card>
    </div>
  );
}
