-- ==========================================================
-- 💿 JanK TRACKER: FINAL ENTERPRISE SCHEMA (v7.0 - MASTER SECURITY)
-- 🛡️ Fully Optimized for Multi-User Isolation & Enhanced Profiles
-- ==========================================================

-- 1. FRESH START (Full Wipe)
DROP TABLE IF EXISTS public.meta_ads CASCADE;
DROP TABLE IF EXISTS public.shopee_commissions CASCADE;
DROP TABLE IF EXISTS public.shopee_clicks CASCADE;
DROP TABLE IF EXISTS public.daily_records CASCADE;
DROP TABLE IF EXISTS public.access_requests CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.deposits CASCADE;

-- 2. CORE IDENTITY: PROFILES
-- Notes: Stores permanent user identity and secure lockout status.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  address text,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_locked boolean DEFAULT false,
  admin_pin VARCHAR(6) DEFAULT '000000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RAW DATA: META ADS
CREATE TABLE public.meta_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    campaign_name TEXT NOT NULL,
    spend DECIMAL(15, 2) DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    user_id UUID NOT NULL, -- Mandatory isolation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RAW DATA: SHOPEE COMMISSIONS
CREATE TABLE public.shopee_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    order_time TIMESTAMP WITH TIME ZONE,
    commission DECIMAL(15, 2) DEFAULT 0,
    technical_source TEXT,
    tag_link TEXT,
    user_id UUID NOT NULL, -- Mandatory isolation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT shopee_comm_unique_order UNIQUE(order_id, user_id)
);

-- 5. RAW DATA: SHOPEE CLICKS
CREATE TABLE public.shopee_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    click_id TEXT,
    click_time TIMESTAMP WITH TIME ZONE,
    technical_source TEXT,
    tag_link TEXT,
    user_id UUID NOT NULL, -- Mandatory isolation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. AGGREGATED DATA: DAILY RECORDS (DASHBOARD CENTER)
CREATE TABLE public.daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('meta', 'shopee_comm', 'shopee_click', 'shopee_orders')),
    source TEXT NOT NULL, 
    spend DECIMAL(15, 2) DEFAULT 0,
    commission DECIMAL(15, 2) DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    user_id UUID NOT NULL, -- Mandatory isolation
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT daily_records_unique_entry UNIQUE(date, category, source, user_id)
);

-- 7. REGISTRY: ACCESS REQUESTS (ONBOARDING)
CREATE TABLE public.access_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text,
    phone text,
    address text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_locked boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 8. FUNDS: DEPOSITS
CREATE TABLE public.deposits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id uuid NOT NULL, -- Mandatory isolation
    created_at timestamptz DEFAULT now()
);

-- 9. SYSTEM: LOGS & SETTINGS
CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    action text NOT NULL,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.platform_settings (
    key text PRIMARY KEY,
    value jsonb,
    updated_at timestamptz DEFAULT now()
);

-- 11. UTILITY: LINK MATRIX (AD REGISTRY)
CREATE TABLE public.link_matrix (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    original_url TEXT NOT NULL,
    tagged_url TEXT NOT NULL,
    tag TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'off', 'pending')),
    user_id uuid NOT NULL, 
    created_at timestamptz DEFAULT now()
);

-- 10. SYSTEM SECURITY: DISABLE ALL RLS (Facilitate Identity Bypass Architecture)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_clicks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_matrix DISABLE ROW LEVEL SECURITY;

-- 11. INITIAL REGISTRY BOOTSTRAP (v7.0 READY)
-- Setup the Primary Admin Node
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin@jank.id', 'JanK Master Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Setup the Initial Pilot User
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('3ae7a40c-e9e5-4f50-bc2c-431485b3fcb7', 'user@jank.id', 'JanK Pilot User', 'user')
ON CONFLICT (email) DO NOTHING;

-- Pre-Approve Identity Registry
INSERT INTO public.access_requests (email, full_name, status)
VALUES ('user@jank.id', 'JanK Pilot User', 'approved'),
       ('brohans@jank.id', 'Bro Hans', 'approved')
ON CONFLICT (email) DO NOTHING;

-- 12. HIGH-PERFORMANCE INDEXING
CREATE INDEX IF NOT EXISTS idx_daily_records_user_date ON public.daily_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_deposits_user_date ON public.deposits(user_id, date);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON public.access_requests(email);
CREATE INDEX IF NOT EXISTS idx_link_matrix_user ON public.link_matrix(user_id);