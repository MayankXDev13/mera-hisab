CREATE TYPE "public"."account_status" AS ENUM('active', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('savings', 'current');--> statement-breakpoint
CREATE TYPE "public"."card_status" AS ENUM('active', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."charge_status" AS ENUM('applied', 'waived', 'reduced');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('active', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('account', 'credit_card');--> statement-breakpoint
CREATE TYPE "public"."transaction_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"opening_balance_paise" integer NOT NULL,
	"current_balance_paise" integer NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts_auth" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"expires_at" timestamp with time zone,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" text,
	"after" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer" text NOT NULL,
	"last4" text NOT NULL,
	"total_limit_paise" integer NOT NULL,
	"used_paise" integer DEFAULT 0 NOT NULL,
	"status" "card_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"phone" text,
	"notes" text,
	"monthly_rate_pct_int" integer DEFAULT 0 NOT NULL,
	"monthly_rate_bps" integer NOT NULL,
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "monthly_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"period_month" text NOT NULL,
	"rate_snapshot_bps" integer NOT NULL,
	"base_amount_paise" integer NOT NULL,
	"charge_amount_paise" integer NOT NULL,
	"status" charge_status DEFAULT 'applied' NOT NULL,
	"waived_amount_paise" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_charges_customer_period_unique" UNIQUE("customer_id","period_month")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direction" "transaction_direction" NOT NULL,
	"amount_paise" integer NOT NULL,
	"customer_id" uuid NOT NULL,
	"source_type" "source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_by" uuid,
	"reversed_from_id" uuid,
	"monthly_charge_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" integer DEFAULT 0 NOT NULL,
	"name" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts_auth" ADD CONSTRAINT "accounts_auth_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_charges" ADD CONSTRAINT "monthly_charges_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transactions_customer_idx" ON "transactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "transactions_source_idx" ON "transactions" USING btree ("source_type","source_id");