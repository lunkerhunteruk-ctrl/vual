-- スタイリスト用ページ（/stylist）：招待と、送られてきたコーデ。2026-11-02
-- サーバー（service role）だけが読み書きする。ブラウザから直接は触れないよう RLS を有効にし、ポリシーは作らない。

CREATE TABLE IF NOT EXISTS stylist_invites (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brief TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stylist_looks (
  id UUID PRIMARY KEY,
  invite_key TEXT NOT NULL REFERENCES stylist_invites(key) ON DELETE CASCADE,
  stylist_name TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'picked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stylist_looks_invite ON stylist_looks(invite_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stylist_looks_created ON stylist_looks(created_at DESC);

ALTER TABLE stylist_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_looks ENABLE ROW LEVEL SECURITY;
