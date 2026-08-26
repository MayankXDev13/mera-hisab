import { openApiSchemas, responseSchemas } from "@repo/schemas";

const Error = {
  type: "object",
  properties: { error: { type: "string" } },
  example: { error: "account not found" },
} as const;

const ValidationError = {
  type: "object",
  properties: {
    error: { type: "string", example: "Validation failed" },
    details: {
      type: "object",
      properties: {
        fieldErrors: { type: "object", example: { name: ["Required"] } },
        formErrors: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

const cookieAuth = {
  type: "apiKey",
  in: "cookie",
  name: "better-auth.session_token",
  description: "better-auth session cookie. Login via POST /api/auth/sign-in/email then reuse cookie.",
} as const;

const listRef = (name: string) => ({ type: "array", items: { $ref: `#/components/schemas/${name}` } });
const wrap = (key: string, refName: string) => ({
  type: "object",
  properties: { [key]: { $ref: `#/components/schemas/${refName}` } },
});

export function buildOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Mera Hisab API",
      version: "1.1.0",
      description:
        "Backend v1 — CRUD → Ledger → Transaction History / Outstanding. All money in integer paise. Auth via better-auth cookie session. Single write path: only ledger (POST /api/transactions and reverse) may mutate balances.",
    },
    servers: [{ url: process.env.API_URL ?? "http://localhost:3001", description: "local" }],
    components: {
      securitySchemes: { cookieAuth },
      schemas: { ...openApiSchemas, ...responseSchemas, Error, ValidationError },
    },
    paths: {
      "/": {
        get: {
          summary: "Root",
          tags: ["health"],
          responses: { "200": { description: "ok", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, service: { type: "string" } } } } } } },
        },
      },
      "/health": {
        get: {
          summary: "Health check",
          tags: ["health"],
          responses: { "200": { description: "ok", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } } },
        },
      },
      "/api/auth/{proxy+}": {
        all: {
          summary: "Better Auth proxy (sign-in, sign-up, sign-out, session)",
          tags: ["auth"],
          description: "Proxied to better-auth via toNodeHandler.",
          parameters: [{ name: "proxy+", in: "path", required: true, schema: { type: "string" }, description: "better-auth subpath e.g. sign-in/email" }],
          responses: { "200": { description: "better-auth response" } },
        },
      },
      "/api/me": {
        get: {
          summary: "Current session user",
          tags: ["auth"],
          security: [{ cookieAuth: [] }],
          responses: {
            "200": { description: "session", content: { "application/json": { schema: { type: "object", properties: { user: { type: "object" }, session: { type: "object" } } } } } },
            "401": { description: "unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/accounts": {
        get: {
          summary: "List accounts",
          tags: ["accounts"],
          security: [{ cookieAuth: [] }],
          responses: {
            "200": { description: "list", content: { "application/json": { schema: { type: "object", properties: { accounts: listRef("Account") } } } } },
            "401": { description: "unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        post: {
          summary: "Create account",
          tags: ["accounts"],
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AccountCreate" } } } },
          responses: {
            "201": { description: "created", content: { "application/json": { schema: wrap("account", "Account") } } },
            "401": { description: "unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "422": { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
          },
        },
      },
      "/api/accounts/{id}": {
        get: {
          summary: "Get account",
          tags: ["accounts"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: wrap("account", "Account") } } },
            "404": { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        patch: {
          summary: "Update account (name/type/status)",
          tags: ["accounts"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AccountUpdate" } } } },
          responses: {
            "200": { description: "updated", content: { "application/json": { schema: wrap("account", "Account") } } },
            "404": { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "422": { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
          },
        },
      },
      "/api/cards": {
        get: {
          summary: "List credit cards",
          tags: ["cards"],
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "list", content: { "application/json": { schema: { type: "object", properties: { cards: listRef("Card") } } } } } },
        },
        post: {
          summary: "Create card",
          tags: ["cards"],
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CardCreate" } } } },
          responses: {
            "201": { description: "created", content: { "application/json": { schema: wrap("card", "Card") } } },
            "422": { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
          },
        },
      },
      "/api/cards/{id}": {
        get: {
          summary: "Get card",
          tags: ["cards"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: wrap("card", "Card") } } },
            "404": { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        patch: {
          summary: "Update card",
          tags: ["cards"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CardUpdate" } } } },
          responses: {
            "200": { description: "updated", content: { "application/json": { schema: wrap("card", "Card") } } },
            "404": { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/customers": {
        get: {
          summary: "List customers",
          tags: ["customers"],
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "list", content: { "application/json": { schema: { type: "object", properties: { customers: listRef("Customer") } } } } } },
        },
        post: {
          summary: "Create customer",
          tags: ["customers"],
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CustomerCreate" } } } },
          responses: {
            "201": { description: "created", content: { "application/json": { schema: wrap("customer", "Customer") } } },
            "409": { description: "username exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "422": { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
          },
        },
      },
      "/api/customers/outstanding": {
        get: {
          summary: "Batch outstanding for customer ids",
          tags: ["customers"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "ids", in: "query", required: false, schema: { type: "string", description: "comma-separated uuids" } }],
          responses: {
            "200": { description: "map of customerId -> outstandingPaise", content: { "application/json": { schema: { type: "object", properties: { outstandings: { type: "object", additionalProperties: { type: "integer" } } } } } } },
          },
        },
      },
      "/api/customers/{id}": {
        get: {
          summary: "Get customer",
          tags: ["customers"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: wrap("customer", "Customer") } } },
            "404": { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        patch: {
          summary: "Update customer",
          tags: ["customers"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CustomerUpdate" } } } },
          responses: {
            "200": { description: "updated", content: { "application/json": { schema: wrap("customer", "Customer") } } },
            "409": { description: "username exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/customers/{id}/outstanding": {
        get: {
          summary: "Customer outstanding (debits - credits)",
          tags: ["customers"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "200": {
              description: "outstanding",
              content: { "application/json": { schema: { type: "object", properties: { customerId: { type: "string", format: "uuid" }, outstandingPaise: { type: "integer" } } } } },
            },
            "404": { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/transactions": {
        get: {
          summary: "List transactions (filter + pagination)",
          tags: ["transactions"],
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "customerId", in: "query", schema: { type: "string", format: "uuid" } },
            { name: "sourceType", in: "query", schema: { type: "string", enum: ["account", "credit_card"] } },
            { name: "sourceId", in: "query", schema: { type: "string", format: "uuid" } },
            { name: "direction", in: "query", schema: { type: "string", enum: ["debit", "credit"] } },
            { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          ],
          responses: {
            "200": {
              description: "paged list",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      transactions: listRef("Transaction"),
                      total: { type: "integer" },
                      page: { type: "integer" },
                      limit: { type: "integer" },
                    },
                  },
                },
              },
            },
            "422": { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
          },
        },
        post: {
          summary: "Create transaction (ledger single write)",
          tags: ["transactions"],
          description: "Validates balance/limit inside a DB transaction. No other route may mutate balances.",
          security: [{ cookieAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TransactionCreate" } } } },
          responses: {
            "201": { description: "created", content: { "application/json": { schema: wrap("transaction", "Transaction") } } },
            "400": { description: "insufficient funds / deactivated source / invalid amount", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "404": { description: "customer/source not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "422": { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
          },
        },
      },
      "/api/transactions/{id}/reverse": {
        post: {
          summary: "Reverse transaction (immutable original, adjusting entry)",
          tags: ["transactions"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            "201": { description: "reversal created", content: { "application/json": { schema: wrap("transaction", "Transaction") } } },
            "400": { description: "insufficient funds for reversal", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "404": { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
    },
  };
}

export const openApiSpec = buildOpenApiSpec();
