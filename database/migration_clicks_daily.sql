-- ==========================================================
-- 💿 JanK TRACKER: DATABASE MIGRATION - SPACE OPTIMIZATION (v8.0)
-- 🛡️ Drops raw shopee_clicks table and creates consolidated shopee_clicks_daily
-- ==========================================================

-- 1. Create the new high-performance daily click summary table
CREATE TABLE IF NOT EXISTS public.shopee_clicks_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    technical_source TEXT NOT NULL,
    tag_link TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT shopee_clicks_daily_unique UNIQUE(date, technical_source, tag_link, user_id)
);

-- 2. Disable Row Level Security (RLS) to match project-wide security settings
ALTER TABLE public.shopee_clicks_daily DISABLE ROW LEVEL SECURITY;

-- 3. Create high-performance index for daily clicks querying
CREATE INDEX IF NOT EXISTS idx_shopee_clicks_daily_user_date ON public.shopee_clicks_daily(user_id, date);

-- 4. DROP the old raw clicks table (This instantly frees up huge amounts of space on Supabase!)
DROP TABLE IF EXISTS public.shopee_clicks CASCADE;
