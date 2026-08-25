import type { Account, CreditCard, Customer, Transaction, MonthlyCharge } from "@repo/db";

export type CardDto = CreditCard & { availablePaise: number };
export type CustomerDto = Customer & { outstandingPaise: number };
export type TransactionDto = Transaction;
export type AccountDto = Account;
export type ChargeDto = MonthlyCharge;

export function toCardDto(c: CreditCard): CardDto {
  return { ...c, availablePaise: c.totalLimitPaise - c.usedPaise };
}

export function toAccountDto(a: Account): AccountDto {
  return { ...a };
}

export function toTransactionDto(t: Transaction): TransactionDto {
  return { ...t };
}

export function toChargeDto(c: MonthlyCharge): ChargeDto {
  return { ...c };
}
