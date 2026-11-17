-- ============================================================================
-- השיבנו דוכנים (Hashivenu Stands) - Independent Cloud Database Schema
-- 100% Standalone Schema (Users, Activists, Stands, Weekly Rosters, Reflections, Leads)
-- ============================================================================

-- 1. USERS & COORDINATORS TABLE (מנהל תוכנה ורכזים)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coordinator' CHECK (role IN ('admin', 'coordinator')),
  phone TEXT,
  assigned_region TEXT DEFAULT 'ירושלים',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACTIVISTS TABLE (מאגר פעילים קיימים ופוטנציאליים)
CREATE TABLE IF NOT EXISTS activists (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  category TEXT NOT NULL DEFAULT 'existing' CHECK (category IN ('existing', 'potential')),
  status TEXT NOT NULL DEFAULT 'פעיל מאושר',
  available_this_week BOOLEAN DEFAULT TRUE,
  preferred_stand TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STANDS & CENTERS TABLE (עמדות דוכנים ומרכזי שיעורים)
CREATE TABLE IF NOT EXISTS stands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'stand' CHECK (type IN ('stand', 'center')),
  city TEXT NOT NULL DEFAULT 'ירושלים',
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  hours TEXT DEFAULT '23:00 - 03:00',
  required_activists INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WEEKLY ROSTERS BY PARASHA (שיבוץ שבועי לפי פרשות השבוע)
CREATE TABLE IF NOT EXISTS weekly_rosters (
  id BIGSERIAL PRIMARY KEY,
  week_id TEXT NOT NULL,
  parasha TEXT NOT NULL,
  stand_id TEXT NOT NULL REFERENCES stands(id) ON DELETE CASCADE,
  lead_id BIGINT,
  assigned_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, stand_id)
);

-- 5. REFLECTIONS & INSIGHTS TABLE (מרכז רפלקציות ותובנות AI)
CREATE TABLE IF NOT EXISTS reflections (
  id BIGSERIAL PRIMARY KEY,
  stand TEXT NOT NULL,
  date_label TEXT NOT NULL,
  activists TEXT NOT NULL,
  youth_count INT DEFAULT 0,
  age_range TEXT DEFAULT '16 - 22',
  hours TEXT DEFAULT '23:00 - 03:00',
  atmosphere TEXT,
  story TEXT NOT NULL,
  leads_raw TEXT,
  ai_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LEADS & REPENTANCE FOLLOW-UP TABLE (מתעניינים בתשובה וליווי נוער - דף 5)
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  stand TEXT NOT NULL,
  week_parasha TEXT NOT NULL,
  interest TEXT NOT NULL,
  interest_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ממתין ליצירת קשר',
  assigned_activist TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
