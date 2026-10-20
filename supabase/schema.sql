-- ==============================================================================
-- 초고속 스마트 가계부 (Personal Account Book) Supabase Database Schema
-- ==============================================================================

-- 1. categories 테이블
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. assets (자산 및 결제수단) 테이블
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('cash', 'bank', 'card')),
    balance NUMERIC NOT NULL DEFAULT 0,
    icon VARCHAR(10) NOT NULL DEFAULT '💳',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. transactions (가계부 트랜잭션) 테이블
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    to_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    memo VARCHAR(255) DEFAULT '',
    image_url TEXT, -- 압축된 영수증/소비 사진 데이터
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. budgets (월별 예산) 테이블
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    year_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year_month)
);

-- Row Level Security (RLS) 활성화
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 1인 사용 / 개인 가계부용 접근 허용 정책
CREATE POLICY "Allow access to categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow access to assets" ON assets FOR ALL USING (true);
CREATE POLICY "Allow access to transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow access to budgets" ON budgets FOR ALL USING (true);
