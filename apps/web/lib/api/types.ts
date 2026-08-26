// Derived via @repo/schemas where possible; keep runtime shapes aligned with api dto.
// Use hisab.ts as deep module source for shared types; this file re-exports for compat.
export type {
  HisabAccount as Account,
  HisabCard as Card,
  HisabCustomer as Customer,
  HisabTransaction as Transaction,
  Outstanding,
  PaginatedTransactions,
  ApiError,
  ApiValidationError,
} from "@/lib/hisab";
