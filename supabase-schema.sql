-- ============================================================
--  Hexed – Supabase SQL Schema
--  Paste the entire contents of this file into the
--  Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ─── Users ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  username              TEXT NOT NULL UNIQUE,
  email                 TEXT NOT NULL UNIQUE,
  password              TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'user',
  join_date             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  views                 INTEGER DEFAULT 0,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  max_tracks            INTEGER DEFAULT 3,
  max_tags              INTEGER DEFAULT 5,
  badges                JSONB DEFAULT '[]',
  hidden_badges         JSONB DEFAULT '[]',
  is_premium            BOOLEAN DEFAULT false,
  premium_expiry        TIMESTAMP WITH TIME ZONE,
  alias                 TEXT,
  aliases               JSONB DEFAULT '[]',
  max_aliases           INTEGER DEFAULT 1,
  discord_id            TEXT UNIQUE,
  discord_avatar        TEXT,
  discord_username      TEXT,
  easter_egg_claimed    BOOLEAN DEFAULT false,
  daily_streak          INTEGER DEFAULT 0,
  last_daily_login      TIMESTAMP WITH TIME ZONE,
  total_daily_logins    INTEGER DEFAULT 0
);

-- ─── Profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name          TEXT DEFAULT '',
  bio                   TEXT DEFAULT '',
  location              TEXT DEFAULT '',
  avatar_url            TEXT,
  banner_url            TEXT,
  background_url        TEXT,
  background_video_url  TEXT,
  music_url             TEXT,
  show_views            BOOLEAN DEFAULT true,
  show_uid              BOOLEAN DEFAULT true,
  show_join_date        BOOLEAN DEFAULT true,
  show_watermark        BOOLEAN DEFAULT true,
  theme_color           TEXT DEFAULT '#F97316',
  background_effect     TEXT DEFAULT 'none',
  reveal_enabled        BOOLEAN DEFAULT true,
  reveal_text           TEXT DEFAULT 'Click to reveal',
  custom_cursor_url     TEXT,
  settings              JSONB DEFAULT '{}'
);

-- ─── Badges ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  icon          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#F97316',
  is_protected  BOOLEAN DEFAULT false,
  description   TEXT DEFAULT '',
  how_to_get    TEXT DEFAULT '',
  visible_to    TEXT DEFAULT 'all',
  available     BOOLEAN DEFAULT true,
  badge_order   INTEGER DEFAULT 0,
  role_id       TEXT DEFAULT ''
);

-- ─── Links ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS links (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon        TEXT DEFAULT '',
  platform    TEXT DEFAULT '',
  style       TEXT DEFAULT 'default',
  "order"     INTEGER DEFAULT 0,
  enabled     BOOLEAN DEFAULT true,
  clicks      INTEGER DEFAULT 0
);

-- ─── Tracks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracks (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  url             TEXT NOT NULL,
  artist_profile  TEXT DEFAULT '',
  "order"         INTEGER DEFAULT 0
);

-- ─── View Logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS view_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address  TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Profile Likes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_likes (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address  TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Sessions (express-session) ─────────────────────────────
CREATE TABLE IF NOT EXISTS session (
  sid     TEXT NOT NULL PRIMARY KEY,
  sess    JSON NOT NULL,
  expire  TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);

-- ─── Discord Events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discord_events (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER REFERENCES users(id) ON DELETE SET NULL,
  discord_id            TEXT NOT NULL,
  discord_username      TEXT,
  discord_global_name   TEXT,
  email                 TEXT,
  action                TEXT NOT NULL DEFAULT 'login',
  is_new_user           BOOLEAN DEFAULT false,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username            TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT DEFAULT '',
  preview_image_url   TEXT,
  profile_snapshot    JSONB DEFAULT '{}',
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uses                INTEGER DEFAULT 0
);

-- ─── Support Tickets ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                          SERIAL PRIMARY KEY,
  user_id                     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  discord_id                  TEXT,
  discord_username            TEXT,
  discord_avatar              TEXT,
  status                      TEXT NOT NULL DEFAULT 'open',
  claimed_by_user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  claimed_by_discord_username TEXT,
  claimed_by_discord_avatar   TEXT,
  created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Ticket Messages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_messages (
  id            SERIAL PRIMARY KEY,
  ticket_id     INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type   TEXT NOT NULL DEFAULT 'user',
  sender_name   TEXT,
  sender_avatar TEXT,
  content       TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Bot Settings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_settings (
  id          SERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Announcements ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'info',
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Changelogs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS changelogs (
  id          SERIAL PRIMARY KEY,
  version     TEXT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  author      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── User Challenges ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_challenges (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_key   TEXT NOT NULL,
  completed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Shop Orders ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_orders (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL,
  price       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Disable Row Level Security on all tables ───────────────
-- (This app uses server-side auth via Express, not Supabase Auth.
--  RLS is disabled so the backend can read/write freely.)
ALTER TABLE users              DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           DISABLE ROW LEVEL SECURITY;
ALTER TABLE badges             DISABLE ROW LEVEL SECURITY;
ALTER TABLE links              DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracks             DISABLE ROW LEVEL SECURITY;
ALTER TABLE view_logs          DISABLE ROW LEVEL SECURITY;
ALTER TABLE profile_likes      DISABLE ROW LEVEL SECURITY;
ALTER TABLE session            DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_events     DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates          DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets            DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages    DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_settings       DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements      DISABLE ROW LEVEL SECURITY;
ALTER TABLE changelogs         DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges    DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders        DISABLE ROW LEVEL SECURITY;
