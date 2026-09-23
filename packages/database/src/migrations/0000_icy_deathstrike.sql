CREATE TABLE IF NOT EXISTS "account_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker_connection_id" uuid NOT NULL,
	"available_cash" double precision DEFAULT 0 NOT NULL,
	"used_margin" double precision DEFAULT 0 NOT NULL,
	"total_collateral" double precision DEFAULT 0 NOT NULL,
	"payin_amount" double precision DEFAULT 0 NOT NULL,
	"payout_amount" double precision DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(255),
	"metadata" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"type" varchar(20) DEFAULT 'string' NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" varchar(2000),
	"category" varchar(100) DEFAULT 'general' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by" varchar(255),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broker_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker_id" varchar(50) NOT NULL,
	"broker_client_id" varchar(100) NOT NULL,
	"label" varchar(255) DEFAULT '' NOT NULL,
	"auth_type" varchar(30) NOT NULL,
	"access_token" varchar(2048) NOT NULL,
	"refresh_token" varchar(2048),
	"api_key" varchar(1024),
	"api_secret" varchar(1024),
	"token_expires_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "broker_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker_connection_id" uuid NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"exchanges_enabled" varchar[] DEFAULT '{}' NOT NULL,
	"user_type" varchar(50) DEFAULT 'individual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checklist_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"setup_playbook_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"provider" varchar(20) NOT NULL,
	"provider_invoice_id" varchar(255),
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(20) DEFAULT 'paid' NOT NULL,
	"paid_at" timestamp with time zone,
	"raw_provider_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker_connection_id" uuid NOT NULL,
	"tradingsymbol" varchar(100) NOT NULL,
	"exchange" varchar(20) NOT NULL,
	"asset_class" varchar(30) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"total_quantity" integer DEFAULT 0 NOT NULL,
	"open_quantity" integer DEFAULT 0 NOT NULL,
	"avg_entry_price" double precision DEFAULT 0 NOT NULL,
	"avg_exit_price" double precision,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"gross_pnl" double precision DEFAULT 0 NOT NULL,
	"total_fees_and_taxes" double precision DEFAULT 0 NOT NULL,
	"net_pnl" double precision DEFAULT 0 NOT NULL,
	"max_favorable_excursion" double precision,
	"max_adverse_excursion" double precision,
	"r_multiple" double precision,
	"holding_period_minutes" integer,
	"trade_type" varchar(10),
	"emotions" varchar[],
	"setup_playbook_id" uuid,
	"rule_compliance_score" double precision,
	"mistake_tags" varchar[],
	"trader_notes" varchar(5000),
	"audio_note_url" varchar(1024),
	"screenshot_urls" varchar[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"channel" varchar(20) DEFAULT 'email' NOT NULL,
	"subject" varchar(500),
	"body" varchar(10000),
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_delivered" boolean DEFAULT false NOT NULL,
	"delivered_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"amount" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"interval" varchar(10) DEFAULT 'month' NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker_connection_id" uuid NOT NULL,
	"isin" varchar(20),
	"tradingsymbol" varchar(100) NOT NULL,
	"exchange" varchar(20) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"authorized_quantity" integer,
	"average_price" double precision DEFAULT 0 NOT NULL,
	"current_price" double precision DEFAULT 0 NOT NULL,
	"pnl" double precision DEFAULT 0 NOT NULL,
	"day_change_percentage" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker_connection_id" uuid NOT NULL,
	"tradingsymbol" varchar(100) NOT NULL,
	"exchange" varchar(20) NOT NULL,
	"segment" varchar(30) NOT NULL,
	"product_type" varchar(20) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"buy_quantity" integer DEFAULT 0 NOT NULL,
	"sell_quantity" integer DEFAULT 0 NOT NULL,
	"buy_average_price" double precision DEFAULT 0 NOT NULL,
	"sell_average_price" double precision DEFAULT 0 NOT NULL,
	"realized_pnl" double precision DEFAULT 0 NOT NULL,
	"unrealized_pnl" double precision DEFAULT 0 NOT NULL,
	"multiplier" double precision DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "setup_playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(2000),
	"entry_criteria" varchar(4000),
	"exit_criteria" varchar(4000),
	"risk_rules" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"provider_subscription_id" varchar(255),
	"provider_customer_id" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker_connection_id" uuid NOT NULL,
	"sync_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"executions_imported" integer DEFAULT 0 NOT NULL,
	"trades_created" integer DEFAULT 0 NOT NULL,
	"trades_updated" integer DEFAULT 0 NOT NULL,
	"error_message" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"segment" varchar(30) NOT NULL,
	"transaction_type" varchar(10),
	"rate_type" varchar(15) DEFAULT 'percentage' NOT NULL,
	"rate_value" double precision NOT NULL,
	"applied_on" varchar(10) DEFAULT 'both' NOT NULL,
	"max_cap" double precision,
	"min_amount" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trade_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"journal_trade_id" uuid NOT NULL,
	"checklist_template_id" uuid NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"compliance_score" double precision,
	"completed_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trade_execution_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_trade_id" uuid NOT NULL,
	"execution_id" uuid NOT NULL,
	"allocated_quantity" integer NOT NULL,
	"allocated_fees" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trade_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker_connection_id" uuid NOT NULL,
	"broker_execution_id" varchar(100) NOT NULL,
	"broker_order_id" varchar(100) NOT NULL,
	"exchange_order_id" varchar(100),
	"tradingsymbol" varchar(100) NOT NULL,
	"exchange" varchar(20) NOT NULL,
	"segment" varchar(30) NOT NULL,
	"transaction_type" varchar(10) NOT NULL,
	"order_type" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"execution_price" double precision NOT NULL,
	"execution_timestamp" timestamp with time zone NOT NULL,
	"brokerage_fee" double precision DEFAULT 0 NOT NULL,
	"stt_tax" double precision DEFAULT 0 NOT NULL,
	"exchange_turnover_fee" double precision DEFAULT 0 NOT NULL,
	"gst_fee" double precision DEFAULT 0 NOT NULL,
	"sebi_charges" double precision DEFAULT 0 NOT NULL,
	"stamp_duty" double precision DEFAULT 0 NOT NULL,
	"total_charges" double precision DEFAULT 0 NOT NULL,
	"fill_hash" varchar(128) NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trade_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"journal_trade_id" uuid NOT NULL,
	"planned_entry_price" double precision,
	"planned_stop_loss" double precision,
	"planned_take_profit" double precision,
	"planned_quantity" double precision,
	"planned_risk_amount" double precision,
	"planned_rr" double precision,
	"plan_adherence_score" double precision,
	"entry_slippage" double precision,
	"exit_slippage" double precision,
	"sl_hit_exactly" double precision,
	"tp_hit_exactly" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trade_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"journal_trade_id" uuid NOT NULL,
	"execution_rating" double precision,
	"plan_rating" double precision,
	"psychology_rating" double precision,
	"emotions" varchar[],
	"mistake_tags" varchar[],
	"reflection" varchar(5000),
	"lesson_learned" varchar(2000),
	"followed_plan" boolean,
	"would_change" boolean,
	"what_would_change" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"has_completed_welcome" boolean DEFAULT false NOT NULL,
	"has_connected_broker" boolean DEFAULT false NOT NULL,
	"has_imported_trades" boolean DEFAULT false NOT NULL,
	"has_journaled_first_trade" boolean DEFAULT false NOT NULL,
	"has_viewed_insights" boolean DEFAULT false NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_onboarding_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'USER' NOT NULL,
	"avatar_url" varchar(512),
	"preferred_currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_broker_connection_id_broker_connections_id_fk" FOREIGN KEY ("broker_connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_connections" ADD CONSTRAINT "broker_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_profiles" ADD CONSTRAINT "broker_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "broker_profiles" ADD CONSTRAINT "broker_profiles_broker_connection_id_broker_connections_id_fk" FOREIGN KEY ("broker_connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_setup_playbook_id_setup_playbooks_id_fk" FOREIGN KEY ("setup_playbook_id") REFERENCES "public"."setup_playbooks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_trades" ADD CONSTRAINT "journal_trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_trades" ADD CONSTRAINT "journal_trades_broker_connection_id_broker_connections_id_fk" FOREIGN KEY ("broker_connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_broker_connection_id_broker_connections_id_fk" FOREIGN KEY ("broker_connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_broker_connection_id_broker_connections_id_fk" FOREIGN KEY ("broker_connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "setup_playbooks" ADD CONSTRAINT "setup_playbooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_broker_connection_id_broker_connections_id_fk" FOREIGN KEY ("broker_connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_checklists" ADD CONSTRAINT "trade_checklists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_checklists" ADD CONSTRAINT "trade_checklists_journal_trade_id_journal_trades_id_fk" FOREIGN KEY ("journal_trade_id") REFERENCES "public"."journal_trades"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_checklists" ADD CONSTRAINT "trade_checklists_checklist_template_id_checklist_templates_id_fk" FOREIGN KEY ("checklist_template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_execution_links" ADD CONSTRAINT "trade_execution_links_journal_trade_id_journal_trades_id_fk" FOREIGN KEY ("journal_trade_id") REFERENCES "public"."journal_trades"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_execution_links" ADD CONSTRAINT "trade_execution_links_execution_id_trade_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."trade_executions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_executions" ADD CONSTRAINT "trade_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_executions" ADD CONSTRAINT "trade_executions_broker_connection_id_broker_connections_id_fk" FOREIGN KEY ("broker_connection_id") REFERENCES "public"."broker_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_plans" ADD CONSTRAINT "trade_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_plans" ADD CONSTRAINT "trade_plans_journal_trade_id_journal_trades_id_fk" FOREIGN KEY ("journal_trade_id") REFERENCES "public"."journal_trades"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_ratings" ADD CONSTRAINT "trade_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trade_ratings" ADD CONSTRAINT "trade_ratings_journal_trade_id_journal_trades_id_fk" FOREIGN KEY ("journal_trade_id") REFERENCES "public"."journal_trades"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_balances_connection_idx" ON "account_balances" USING btree ("broker_connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_balances_connection_unique" ON "account_balances" USING btree ("broker_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_actor_idx" ON "admin_audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_entity_idx" ON "admin_audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admin_configs_key_unique" ON "admin_configs" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_configs_category_idx" ON "admin_configs" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broker_connections_user_id_idx" ON "broker_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broker_connections_broker_id_idx" ON "broker_connections" USING btree ("broker_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broker_connections_status_idx" ON "broker_connections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "broker_connections_user_broker_unique" ON "broker_connections" USING btree ("user_id","broker_id","broker_client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broker_profiles_connection_idx" ON "broker_profiles" USING btree ("broker_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broker_profiles_user_id_idx" ON "broker_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ck_templates_user_id_idx" ON "checklist_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ck_templates_playbook_idx" ON "checklist_templates" USING btree ("setup_playbook_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_user_id_idx" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_subscription_idx" ON "invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_provider_inv_idx" ON "invoices" USING btree ("provider_invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_user_status_idx" ON "invoices" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_trades_connection_idx" ON "journal_trades" USING btree ("broker_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_trades_user_id_idx" ON "journal_trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_trades_symbol_idx" ON "journal_trades" USING btree ("tradingsymbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_trades_status_idx" ON "journal_trades" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_trades_opened_at_idx" ON "journal_trades" USING btree ("opened_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_trades_user_status_idx" ON "journal_trades" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_delivered_idx" ON "notifications" USING btree ("is_delivered");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_type_idx" ON "notifications" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plans_slug_unique" ON "plans" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plans_active_idx" ON "plans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plans_sort_idx" ON "plans" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holdings_connection_idx" ON "portfolio_holdings" USING btree ("broker_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holdings_user_id_idx" ON "portfolio_holdings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holdings_symbol_idx" ON "portfolio_holdings" USING btree ("tradingsymbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holdings_user_connection_idx" ON "portfolio_holdings" USING btree ("user_id","broker_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positions_connection_idx" ON "positions" USING btree ("broker_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positions_user_id_idx" ON "positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positions_symbol_segment_idx" ON "positions" USING btree ("tradingsymbol","segment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positions_user_connection_idx" ON "positions" USING btree ("user_id","broker_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playbooks_user_id_idx" ON "setup_playbooks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_user_id_unique" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_plan_id_idx" ON "subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_provider_sub_idx" ON "subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_logs_connection_idx" ON "sync_logs" USING btree ("broker_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_logs_user_id_idx" ON "sync_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_logs_status_idx" ON "sync_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tax_rates_segment_idx" ON "tax_rates" USING btree ("segment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tax_rates_active_idx" ON "tax_rates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tc_user_id_idx" ON "trade_checklists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tc_trade_id_idx" ON "trade_checklists" USING btree ("journal_trade_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tc_user_trade_unique" ON "trade_checklists" USING btree ("user_id","journal_trade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execution_links_journal_trade_idx" ON "trade_execution_links" USING btree ("journal_trade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execution_links_execution_idx" ON "trade_execution_links" USING btree ("execution_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "execution_links_unique" ON "trade_execution_links" USING btree ("journal_trade_id","execution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_connection_idx" ON "trade_executions" USING btree ("broker_connection_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_symbol_idx" ON "trade_executions" USING btree ("tradingsymbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_timestamp_idx" ON "trade_executions" USING btree ("execution_timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "executions_fill_hash_unique" ON "trade_executions" USING btree ("fill_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "executions_user_symbol_ts_idx" ON "trade_executions" USING btree ("user_id","tradingsymbol","execution_timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tp_user_id_idx" ON "trade_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tp_trade_id_idx" ON "trade_plans" USING btree ("journal_trade_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tp_user_trade_unique" ON "trade_plans" USING btree ("user_id","journal_trade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tr_user_id_idx" ON "trade_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tr_trade_id_idx" ON "trade_ratings" USING btree ("journal_trade_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tr_user_trade_unique" ON "trade_ratings" USING btree ("user_id","journal_trade_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_user_id_unique" ON "user_onboarding" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");