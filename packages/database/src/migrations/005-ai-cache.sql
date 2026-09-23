-- ──────────────────────────────────────────────
-- Migration 005: AI Cache Table & RLS Policies
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_cache (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cache_key    text        NOT NULL,
  result       jsonb       NOT NULL,
  provider     varchar(50),
  tokens_used  integer,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);

-- Unique constraint for cache lookup per user
CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_user_key_idx ON public.ai_cache (user_id, cache_key);
CREATE INDEX IF NOT EXISTS ai_cache_expires_idx        ON public.ai_cache (expires_at);

-- Row Level Security
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_cache: all own or admin" ON public.ai_cache;
CREATE POLICY "ai_cache: all own or admin" ON public.ai_cache
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());
