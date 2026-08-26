export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Mera Hisab API",
    version: "1.0.0",
    description:
      "Backend v1 — CRUD → Ledger → Transaction History / Outstanding. All money in integer paise. Auth via better-auth cookie session. Single write path: only ledger (POST /api/transactions and reverse) may mutate balances.",
  },
  servers: [{ url: "http://localhost:3001", description: "local" }],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description: "better-auth session cookie. Login via POST /api/auth/sign-in/email then reuse cookie.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
        example: { error: "account not found" },
      },
      ValidationError: {
        type: "object",
        properties: {
          error: { type: "string", example: "Validation failed" },
          details: {
            type: "object",
            properties: {
              fieldErrors: {
                type: "object",
                example: { name: ["Required"] },
              },
              formErrors: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      Account: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "HDFC Savings" },
          type: { type: "string", enum: ["savings", "current"] },
          openingBalancePaise: { type: "integer", example: 500000 },
          currentBalancePaise: { type: "integer", example: 480000 },
          status: { type: "string", enum: ["active", "deactivated"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AccountCreate: {
        type: "object",
        required: ["name", "openingBalancePaise"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200, example: "HDFC Savings" },
          type: { type: "string", enum: ["savings", "current"], default: "savings" },
          openingBalancePaise: { type: "integer", minimum: 0, example: 500000, description: "paise, 100 paise = 1 rupee" },
        },
      },
      AccountUpdate: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200 },
          type: { type: "string", enum: ["savings", "current"] },
          status: { type: "string", enum: ["active", "deactivated"] },
        },
      },
      Card: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          issuer: { type: "string", example: "HDFC" },
          last4: { type: "string", pattern: "^\\d{4}$", example: "4521" },
          totalLimitPaise: { type: "integer", example: 20000000 },
          usedPaise: { type: "integer", example: 500000 },
          availablePaise: { type: "integer", example: 19500000, description: "totalLimitPaise - usedPaise" },
          status: { type: "string", enum: ["active", "deactivated"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CardCreate: {
        type: "object",
        required: ["issuer", "last4", "totalLimitPaise"],
        properties: {
          issuer: { type: "string", example: "HDFC" },
          last4: { type: "string", pattern: "^\\d{4}$", example: "4521" },
          totalLimitPaise: { type: "integer", minimum: 1, example: 20000000 },
        },
      },
      CardUpdate: {
        type: "object",
        properties: {
          issuer: { type: "string" },
          last4: { type: "string", pattern: "^\\d{4}$" },
          totalLimitPaise: { type: "integer", minimum: 1 },
          status: { type: "string", enum: ["active", "deactivated"] },
        },
      },
      Customer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Ramesh Kumar" },
          username: { type: "string", example: "ramesh.kumar" },
          email: { type: "string", nullable: true, example: "ramesh@example.com" },
          phone: { type: "string", nullable: true, example: "+919999999999" },
          notes: { type: "string", nullable: true },
          monthlyRateBps: { type: "integer", minimum: 0, maximum: 10000, example: 250, description: "250 = 2.50% per month" },
          status: { type: "string", enum: ["active", "deactivated"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CustomerCreate: {
        type: "object",
        required: ["name", "username", "monthlyRateBps"],
        properties: {
          name: { type: "string", example: "Ramesh Kumar" },
          username: { type: "string", pattern: "^[a-zA-Z0-9_.-]+$", example: "ramesh.kumar" },
          email: { type: "string", format: "email", nullable: true },
          phone: { type: "string", nullable: true, example: "+919999999999" },
          notes: { type: "string", nullable: true },
          monthlyRateBps: { type: "integer", minimum: 0, maximum: 10000, example: 250 },
          status: { type: "string", enum: ["active", "deactivated"] },
        },
      },
      CustomerUpdate: {
        type: "object",
        properties: {
          name: { type: "string" },
          username: { type: "string", pattern: "^[a-zA-Z0-9_.-]+$" },
          email: { type: "string", format: "email", nullable: true },
          phone: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          monthlyRateBps: { type: "integer", minimum: 0, maximum: 10000 },
          status: { type: "string", enum: ["active", "deactivated"] },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          direction: { type: "string", enum: ["debit", "credit"] },
          amountPaise: { type: "integer", example: 50000 },
          customerId: { type: "string", format: "uuid" },
          sourceType: { type: "string", enum: ["account", "credit_card"] },
          sourceId: { type: "string", format: "uuid" },
          occurredAt: { type: "string", format: "date-time" },
          note: { type: "string", nullable: true },
          createdBy: { type: "string", nullable: true, description: "actor user.id (text) from better-auth" },
          reversedFromId: { type: "string", nullable: true, format: "uuid" },
          monthlyChargeId: { type: "string", nullable: true, format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TransactionCreate: {
        type: "object",
        required: ["direction", "customerId", "sourceType", "sourceId"],
        properties: {
          direction: { type: "string", enum: ["debit", "credit"], description: "debit = give money, credit = receive" },
          customerId: { type: "string", format: "uuid" },
          sourceType: { type: "string", enum: ["account", "credit_card"] },
          sourceId: { type: "string", format: "uuid", description: "account.id or creditCards.id" },
          amountPaise: { type: "integer", minimum: 1, example: 50000, description: "xor amountRupees" },
          amountRupees: {
            oneOf: [{ type: "string", example: "500.00" }, { type: "number", example: 500 }],
            description: "xor amountPaise, converted via rupeesToPaise without float loss",
          },
          occurredAt: { type: "string", format: "date-time", description: "defaults to now" },
          note: { type: "string", nullable: true, maxLength: 2000 },
          monthlyChargeId: { type: "string", format: "uuid", nullable: true },
        },
      },
    },
  },
  paths: {
    "/": {
      get: {
        summary: "Root",
        tags: ["health"],
        responses: { 200: { description: "ok", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, service: { type: "string" } } } } } } },
      },
    },
    "/health": {
      get: {
        summary: "Health check",
        tags: ["health"],
        responses: { 200: { description: "ok", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } } },
      },
    },
    "/api/auth/{proxy+}": {
      all: {
        summary: "Better Auth proxy (sign-in, sign-up, sign-out, session)",
        tags: ["auth"],
        description: "Proxied to better-auth via toNodeHandler. Use POST /api/auth/sign-in/email with { email, password } and POST /api/auth/sign-up/email. Session via cookie.",
        parameters: [{ name: "proxy+", in: "path", required: true, schema: { type: "string" }, description: "better-auth subpath e.g. sign-in/email" }],
        responses: { 200: { description: "better-auth response" } },
      },
    },
    "/api/me": {
      get: {
        summary: "Current session user",
        tags: ["auth"],
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: "session", content: { "application/json": { schema: { type: "object", properties: { user: { type: "object" }, session: { type: "object" } } } } } },
          401: { description: "unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/accounts": {
      get: {
        summary: "List accounts",
        tags: ["accounts"],
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: "list", content: { "application/json": { schema: { type: "object", properties: { accounts: { type: "array", items: { $ref: "#/components/schemas/Account" } } } } } } },
          401: { description: "unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        summary: "Create account",
        tags: ["accounts"],
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AccountCreate" } } } },
        responses: {
          201: { description: "created", content: { "application/json": { schema: { type: "object", properties: { account: { $ref: "#/components/schemas/Account" } } } } } },
          401: { description: "unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          422: { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
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
          200: { description: "ok", content: { "application/json": { schema: { type: "object", properties: { account: { $ref: "#/components/schemas/Account" } } } } } },
          404: { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        summary: "Update account (name/type/status)",
        tags: ["accounts"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AccountUpdate" } } } },
        responses: {
          200: { description: "updated", content: { "application/json": { schema: { type: "object", properties: { account: { $ref: "#/components/schemas/Account" } } } } } },
          404: { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          422: { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
        },
      },
    },
    "/api/cards": {
      get: {
        summary: "List credit cards",
        tags: ["cards"],
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: "list", content: { "application/json": { schema: { type: "object", properties: { cards: { type: "array", items: { $ref: "#/components/schemas/Card" } } } } } } } },
      },
      post: {
        summary: "Create card",
        tags: ["cards"],
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CardCreate" } } } },
        responses: {
          201: { description: "created", content: { "application/json": { schema: { type: "object", properties: { card: { $ref: "#/components/schemas/Card" } } } } } },
          422: { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
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
          200: { description: "ok", content: { "application/json": { schema: { type: "object", properties: { card: { $ref: "#/components/schemas/Card" } } } } } },
          404: { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        summary: "Update card",
        tags: ["cards"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CardUpdate" } } } },
        responses: {
          200: { description: "updated", content: { "application/json": { schema: { type: "object", properties: { card: { $ref: "#/components/schemas/Card" } } } } } },
          404: { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/customers": {
      get: {
        summary: "List customers",
        tags: ["customers"],
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: "list", content: { "application/json": { schema: { type: "object", properties: { customers: { type: "array", items: { $ref: "#/components/schemas/Customer" } } } } } } } },
      },
      post: {
        summary: "Create customer",
        tags: ["customers"],
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CustomerCreate" } } } },
        responses: {
          201: { description: "created", content: { "application/json": { schema: { type: "object", properties: { customer: { $ref: "#/components/schemas/Customer" } } } } } },
          409: { description: "username exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          422: { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
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
          200: { description: "ok", content: { "application/json": { schema: { type: "object", properties: { customer: { $ref: "#/components/schemas/Customer" } } } } } },
          404: { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        summary: "Update customer",
        tags: ["customers"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CustomerUpdate" } } } },
        responses: {
          200: { description: "updated", content: { "application/json": { schema: { type: "object", properties: { customer: { $ref: "#/components/schemas/Customer" } } } } } },
          409: { description: "username exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
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
          200: {
            description: "outstanding",
            content: { "application/json": { schema: { type: "object", properties: { customerId: { type: "string", format: "uuid" }, outstandingPaise: { type: "integer", example: 150000 } } } } },
          },
          404: { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
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
          200: {
            description: "paged list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    transactions: { type: "array", items: { $ref: "#/components/schemas/Transaction" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
          422: { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
        },
      },
      post: {
        summary: "Create transaction (ledger single write)",
        tags: ["transactions"],
        description: "Validates balance/limit inside a DB transaction. No other route may mutate balances.",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TransactionCreate" } } } },
        responses: {
          201: { description: "created", content: { "application/json": { schema: { type: "object", properties: { transaction: { $ref: "#/components/schemas/Transaction" } } } } } },
          400: { description: "insufficient funds / deactivated source / invalid amount", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "customer/source not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          422: { description: "validation", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" } } } },
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
          201: { description: "reversal created", content: { "application/json": { schema: { type: "object", properties: { transaction: { $ref: "#/components/schemas/Transaction" } } } } } },
          400: { description: "insufficient funds for reversal", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
} as const;
