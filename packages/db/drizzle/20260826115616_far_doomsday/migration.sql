CREATE TYPE "funding_source_kind" AS ENUM('bank_account', 'credit_card');--> statement-breakpoint
CREATE TYPE "funding_source_status" AS ENUM('active', 'deactivated');--> statement-breakpoint
CREATE TYPE "customer_status" AS ENUM('active', 'deactivated');--> statement-breakpoint
CREATE TYPE "transaction_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TABLE "funding_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"kind" "funding_source_kind" NOT NULL,
	"name" text NOT NULL,
	"status" "funding_source_status" DEFAULT 'active'::"funding_source_status" NOT NULL,
	"opening_balance_paise" integer,
	"current_balance_paise" integer,
	"issuer" text,
	"last4" text,
	"total_limit_paise" integer,
	"used_paise" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funding_sources_id_user_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"phone" text,
	"notes" text,
	"monthly_rate_bps" integer NOT NULL,
	"status" "customer_status" DEFAULT 'active'::"customer_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_user_username_unique" UNIQUE("user_id","username"),
	CONSTRAINT "customers_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "customer_rate_bps_range" CHECK ("monthly_rate_bps" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
CREATE TABLE "transaction_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"transaction_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"amount_paise" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alloc_txn_source_unique" UNIQUE("transaction_id","source_id"),
	CONSTRAINT "alloc_amount_positive" CHECK ("amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"direction" "transaction_direction" NOT NULL,
	"amount_paise" integer NOT NULL,
	"customer_id" uuid NOT NULL,
	"source_id" uuid,
	"occurred_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "txn_direction_source_shape" CHECK (("direction" = 'debit' AND "source_id" IS NOT NULL) OR ("direction" = 'credit' AND "source_id" IS NULL)),
	CONSTRAINT "txn_amount_positive" CHECK ("amount_paise" > 0)
);
--> statement-breakpoint
CREATE INDEX "funding_sources_user_kind_idx" ON "funding_sources" ("user_id","kind");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "customers_user_idx" ON "customers" ("user_id");--> statement-breakpoint
CREATE INDEX "alloc_user_customer_idx" ON "transaction_allocations" ("user_id","customer_id");--> statement-breakpoint
CREATE INDEX "alloc_source_idx" ON "transaction_allocations" ("source_id");--> statement-breakpoint
CREATE INDEX "transactions_user_occurred_idx" ON "transactions" ("user_id","occurred_at" DESC);--> statement-breakpoint
CREATE INDEX "transactions_user_customer_idx" ON "transactions" ("user_id","customer_id");--> statement-breakpoint
CREATE INDEX "transactions_source_idx" ON "transactions" ("source_id");--> statement-breakpoint
ALTER TABLE "funding_sources" ADD CONSTRAINT "funding_sources_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "transaction_allocations_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "alloc_txn_tenant_fk" FOREIGN KEY ("transaction_id","user_id") REFERENCES "transactions"("id","user_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "alloc_source_tenant_fk" FOREIGN KEY ("source_id","user_id") REFERENCES "funding_sources"("id","user_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "txn_customer_tenant_fk" FOREIGN KEY ("customer_id","user_id") REFERENCES "customers"("id","user_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "txn_source_tenant_fk" FOREIGN KEY ("source_id","user_id") REFERENCES "funding_sources"("id","user_id");