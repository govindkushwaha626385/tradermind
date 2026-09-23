-- ──────────────────────────────────────────────
-- Migration 007: Digital Products Store & User Reviews
-- ──────────────────────────────────────────────

-- 1. Products table
CREATE TABLE IF NOT EXISTS public.products (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  title               varchar(200) NOT NULL,
  description         text         NOT NULL,
  long_description    text,
  product_type        varchar(20)  NOT NULL DEFAULT 'PDF',
  price               integer      NOT NULL DEFAULT 0,
  currency            varchar(3)   NOT NULL DEFAULT 'INR',
  download_url        text,
  video_url           text,
  preview_image_url   text,
  tags                jsonb        NOT NULL DEFAULT '[]'::jsonb,
  metadata            jsonb        NOT NULL DEFAULT '{}'::jsonb,
  is_active           boolean      NOT NULL DEFAULT true,
  is_free             boolean      NOT NULL DEFAULT false,
  sort_order          integer      NOT NULL DEFAULT 0,
  total_sales         integer      NOT NULL DEFAULT 0,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

-- 2. Product orders table
CREATE TABLE IF NOT EXISTS public.product_orders (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id          uuid         NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  amount_paid         integer      NOT NULL DEFAULT 0,
  currency            varchar(3)   NOT NULL DEFAULT 'INR',
  provider            varchar(20)  NOT NULL DEFAULT 'razorpay',
  provider_order_id   varchar(255),
  provider_payment_id varchar(255),
  provider_signature  varchar(512),
  status              varchar(20)  NOT NULL DEFAULT 'pending',
  raw_provider_data   jsonb,
  paid_at             timestamptz,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

-- 3. Product access table
CREATE TABLE IF NOT EXISTS public.product_access (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id          uuid         NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id            uuid         REFERENCES public.product_orders(id),
  grant_reason        varchar(50)  NOT NULL DEFAULT 'purchased',
  download_count      integer      NOT NULL DEFAULT 0,
  last_accessed_at    timestamptz,
  access_granted_at   timestamptz  NOT NULL DEFAULT now()
);

-- 4. Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating              integer      NOT NULL DEFAULT 5,
  headline            varchar(150) NOT NULL,
  body                text         NOT NULL,
  trader_type         varchar(100),
  display_name        varchar(100),
  is_approved         boolean      NOT NULL DEFAULT false,
  is_featured         boolean      NOT NULL DEFAULT false,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS products_type_idx ON public.products (product_type);
CREATE INDEX IF NOT EXISTS products_active_idx ON public.products (is_active);
CREATE INDEX IF NOT EXISTS product_orders_user_idx ON public.product_orders (user_id);
CREATE INDEX IF NOT EXISTS product_orders_status_idx ON public.product_orders (status);
CREATE INDEX IF NOT EXISTS product_access_user_prod_idx ON public.product_access (user_id, product_id);
CREATE INDEX IF NOT EXISTS reviews_approved_idx ON public.reviews (is_approved);
CREATE INDEX IF NOT EXISTS reviews_featured_idx ON public.reviews (is_featured);

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products: public read active" ON public.products;
CREATE POLICY "products: public read active" ON public.products
  FOR SELECT USING (is_active = true OR public.is_admin());
DROP POLICY IF EXISTS "products: admin all" ON public.products;
CREATE POLICY "products: admin all" ON public.products
  FOR ALL USING (public.is_admin());

ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_orders: select own or admin" ON public.product_orders;
CREATE POLICY "product_orders: select own or admin" ON public.product_orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "product_orders: admin all" ON public.product_orders;
CREATE POLICY "product_orders: admin all" ON public.product_orders
  FOR ALL USING (public.is_admin());

ALTER TABLE public.product_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_access: select own or admin" ON public.product_access;
CREATE POLICY "product_access: select own or admin" ON public.product_access
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "product_access: admin all" ON public.product_access;
CREATE POLICY "product_access: admin all" ON public.product_access
  FOR ALL USING (public.is_admin());

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews: public read approved" ON public.reviews;
CREATE POLICY "reviews: public read approved" ON public.reviews
  FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "reviews: user manage own" ON public.reviews;
CREATE POLICY "reviews: user manage own" ON public.reviews
  FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "reviews: admin all" ON public.reviews;
CREATE POLICY "reviews: admin all" ON public.reviews
  FOR ALL USING (public.is_admin());
