-- Global classification cache (keyed by model + review content hash)

CREATE TABLE IF NOT EXISTS classification_cache (
  content_hash TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  source TEXT NOT NULL,
  review_text TEXT NOT NULL,
  discovery_relevant INTEGER NOT NULL DEFAULT 0,
  discovery_reason TEXT,
  discovery_confidence REAL,
  theme TEXT,
  barrier TEXT,
  behavior TEXT,
  emotion TEXT,
  segment TEXT,
  root_cause TEXT,
  unmet_need TEXT,
  confidence REAL,
  evidence TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_classification_cache_model ON classification_cache (model);
