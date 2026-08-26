import { z } from "zod";
import { createAccountSchema, updateAccountSchema } from "./accounts.js";
import { createCardSchema, updateCardSchema } from "./cards.js";
import { createCustomerSchema, updateCustomerSchema } from "./customers.js";
import { createTransactionSchema, transactionFilterQuerySchema } from "./transactions.js";
import { paginationSchema } from "./common.js";

type JsonSchemaObject = Record<string, unknown>;

function toOpenApiSchema(schema: z.core.$ZodType): JsonSchemaObject {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JsonSchemaObject;
  delete json.$schema;
  // json schema type integer -> openapi integer (same), nullable handled via anyOf in v4 output
  return json;
}

export const openApiSchemas = {
  AccountCreate: toOpenApiSchema(createAccountSchema),
  AccountUpdate: toOpenApiSchema(updateAccountSchema),
  CardCreate: toOpenApiSchema(createCardSchema),
  CardUpdate: toOpenApiSchema(updateCardSchema),
  CustomerCreate: toOpenApiSchema(createCustomerSchema),
  CustomerUpdate: toOpenApiSchema(updateCustomerSchema),
  TransactionCreate: toOpenApiSchema(createTransactionSchema),
  TransactionFilterQuery: toOpenApiSchema(transactionFilterQuerySchema),
  Pagination: toOpenApiSchema(paginationSchema),
} as const;

export type OpenApiSchemaName = keyof typeof openApiSchemas;

/** Response schemas mirror the DTO shapes (dates are ISO strings). */
const isoString = { type: "string", format: "date-time" } as const;

export const responseSchemas = {
  Account: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      type: { type: "string", enum: ["savings", "current"] },
      openingBalancePaise: { type: "integer" },
      currentBalancePaise: { type: "integer" },
      status: { type: "string", enum: ["active", "deactivated"] },
      createdAt: isoString,
      updatedAt: isoString,
    },
  },
  Card: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      issuer: { type: "string" },
      last4: { type: "string" },
      totalLimitPaise: { type: "integer" },
      usedPaise: { type: "integer" },
      availablePaise: { type: "integer", description: "totalLimitPaise - usedPaise" },
      status: { type: "string", enum: ["active", "deactivated"] },
      createdAt: isoString,
      updatedAt: isoString,
    },
  },
  Customer: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      username: { type: "string" },
      email: { type: "string", nullable: true },
      phone: { type: "string", nullable: true },
      notes: { type: "string", nullable: true },
      monthlyRateBps: { type: "integer", minimum: 0, maximum: 10000 },
      status: { type: "string", enum: ["active", "deactivated"] },
      createdAt: isoString,
      updatedAt: isoString,
    },
  },
  Transaction: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      direction: { type: "string", enum: ["debit", "credit"] },
      amountPaise: { type: "integer" },
      customerId: { type: "string", format: "uuid" },
      sourceType: { type: "string", enum: ["account", "credit_card"] },
      sourceId: { type: "string", format: "uuid" },
      occurredAt: isoString,
      note: { type: "string", nullable: true },
      createdBy: { type: "string", nullable: true },
      reversedFromId: { type: "string", nullable: true, format: "uuid" },
      createdAt: isoString,
    },
  },
} as const;
