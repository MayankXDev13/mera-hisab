# api-006: Reporting — exports and dashboard aggregation

## Problem

`apps/api/src/routes/exports.ts` builds CSV as a string and pipes `PDFDocument` inline, `apps/api/src/routes/dashboard.ts` loops `store.transactions.values()` to sum `totalDisbursed`, `totalReceived`, `totalCharges`, `totalWaived`, `outstanding`, and `apps/api/src/routes/transactions.ts` reimplements the same `customerId`, `direction`, `from`, `to`, `q` filters. Only `audit` paginates via `paginationSchema`. `computeOutstanding` rescans all transactions, and `customers GET` does it for every customer `O(n*m)`. No shared filter, no streaming, no SQL aggregate.

## Proposed Interface

A reporting module that owns query parsing and aggregation, with streaming exports.

```ts
// apps/api/src/lib/reporting.ts
export type TxFilter = { customerId?: string, direction?: "debit"|"credit", from?: Date, to?: Date, q?: string, page?: number, limit?: number }
export type Reporting = {
  getDashboard(): Promise<{ totals: DashboardTotals, accounts: AccountDto[], cards: CardDto[], customers: CustomerDto[] }>
  listTransactions(filter: TxFilter): Promise<{ data: TransactionDto[], total: number, page: number, limit: number }>
  exportTransactionsCsv(filter: TxFilter): Promise<NodeJS.ReadableStream>
  exportCustomersCsv(): Promise<NodeJS.ReadableStream>
  exportChargesCsv(filter: { customerId?: string }): Promise<NodeJS.ReadableStream>
  getStatementPdf(customerId: string): Promise<NodeJS.ReadableStream>
}

export function createReporting(deps: { repo: LedgerRepo }): Reporting
```

Route wiring:

```ts
router.get("/dashboard", async (req, res) => res.json(await reporting.getDashboard()))
router.get("/exports/transactions.csv", async (req, res) => {
  res.type("text/csv")
  ;(await reporting.exportTransactionsCsv(req.validated.query)).pipe(res)
})
```

What it hides: date parsing, pagination defaults, `computeOutstanding` SQL, CSV formatting, PDF generation via `pdfkit`. What it exposes: `getDashboard`, `listTransactions`, export streams.

## Dependency Strategy

**In-process today, local-substitutable with Postgres.** Today scans are in memory; after api-001, aggregates move to SQL `SUM` through the repo. No external service.

## Testing Strategy

- **New boundary tests to write**
  - `GET /dashboard` totals equal sum of seeded ledger rows
  - `GET /transactions?from&to` filters by `occurredAt`, `q` searches note and customer name
  - pagination `page` beyond total returns empty data with correct `total`
  - CSV export has header row and row count matching filter, valid `text/csv`
  - PDF export is valid PDF and contains the period or customer name

- **Old tests to delete**
  - per-file filter unit tests that duplicate the parser; keep one boundary suite for the shared filter

- **Test environment needs**
  - seeded ephemeral Postgres or memory repo with equivalent aggregates

## Implementation Recommendations

- Own filter parsing in one `parseTxFilter` reused by `transactions`, `dashboard`, `audit`, `exports`.
- Hide aggregation in SQL; do not rescan `transactions` per customer.
- Expose streaming CSV and PDF so large exports do not build full strings in memory.
- Migrate by extracting the repeated `from` and `to` `new Date(str)` logic into the shared filter parser and switching `exports.ts` from string build to stream.
