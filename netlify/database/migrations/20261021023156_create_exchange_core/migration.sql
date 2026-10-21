CREATE TABLE "admin_actions" (
	"id" serial PRIMARY KEY,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"reason" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cat_events" (
	"id" serial PRIMARY KEY,
	"event_type" text NOT NULL,
	"order_id" integer,
	"participant_id" text,
	"instrument_id" integer,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'staged' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" serial PRIMARY KEY,
	"instrument_id" integer NOT NULL,
	"buy_order_id" integer,
	"sell_order_id" integer,
	"buyer_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"price_cents" integer NOT NULL,
	"qty" integer NOT NULL,
	"aggressor_side" text NOT NULL,
	"venue" text DEFAULT 'TWE' NOT NULL,
	"seq" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holdings" (
	"participant_id" text,
	"instrument_id" integer,
	"qty" bigint DEFAULT 0 NOT NULL,
	"restricted_qty" bigint DEFAULT 0 NOT NULL,
	"restricted_until" timestamp,
	"frozen" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "holdings_pkey" PRIMARY KEY("participant_id","instrument_id")
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" serial PRIMARY KEY,
	"symbol" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"asset_class" text NOT NULL,
	"token_standard" text NOT NULL,
	"issuance_platform" text NOT NULL,
	"chain" text NOT NULL,
	"reg_exemption" text NOT NULL,
	"permissioned" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"ref_price_cents" integer NOT NULL,
	"tick_cents" integer DEFAULT 1 NOT NULL,
	"lockup_days" integer DEFAULT 0 NOT NULL,
	"total_supply" bigint DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"cl_ord_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"instrument_id" integer NOT NULL,
	"side" text NOT NULL,
	"type" text NOT NULL,
	"tif" text DEFAULT 'gtc' NOT NULL,
	"price_cents" integer,
	"qty" integer NOT NULL,
	"leaves_qty" integer NOT NULL,
	"cum_qty" integer DEFAULT 0 NOT NULL,
	"filled_notional_cents" bigint DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"reject_reason" text,
	"routing" text DEFAULT 'internal' NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"seq" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"country" text NOT NULL,
	"accredited" boolean DEFAULT false NOT NULL,
	"kyc_status" text DEFAULT 'approved' NOT NULL,
	"sanctions_clear" boolean DEFAULT true NOT NULL,
	"wallet" text,
	"credential_id" text,
	"cash_cents" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" serial PRIMARY KEY,
	"execution_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"buyer_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"qty" integer NOT NULL,
	"amount_cents" bigint NOT NULL,
	"mode" text NOT NULL,
	"rail" text NOT NULL,
	"status" text DEFAULT 'matched' NOT NULL,
	"fail_reason" text,
	"tx_ref" text,
	"due_at" timestamp NOT NULL,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveillance_alerts" (
	"id" serial PRIMARY KEY,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"participant_id" text,
	"instrument_id" integer,
	"details" jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue_routes" (
	"id" serial PRIMARY KEY,
	"parent_order_id" integer NOT NULL,
	"venue" text NOT NULL,
	"side" text NOT NULL,
	"qty" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"fee_bps" integer NOT NULL,
	"score" integer NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wal" (
	"seq" bigserial PRIMARY KEY,
	"instrument_id" integer,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "executions_instrument_idx" ON "executions" ("instrument_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_participant_clordid_idx" ON "orders" ("participant_id","cl_ord_id");--> statement-breakpoint
CREATE INDEX "orders_book_idx" ON "orders" ("instrument_id","side","status");--> statement-breakpoint
CREATE INDEX "settlements_status_idx" ON "settlements" ("status","due_at");--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_instrument_id_instruments_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id");--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_participant_id_participants_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id");--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_instrument_id_instruments_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_participant_id_participants_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_instrument_id_instruments_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id");--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_execution_id_executions_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id");--> statement-breakpoint
ALTER TABLE "venue_routes" ADD CONSTRAINT "venue_routes_parent_order_id_orders_id_fkey" FOREIGN KEY ("parent_order_id") REFERENCES "orders"("id");