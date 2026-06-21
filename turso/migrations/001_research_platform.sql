-- Turso / SQLite schema for Review Discovery Engine

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS analysis_runs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  dataset_name TEXT NOT NULL,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  discovery_reviews INTEGER NOT NULL DEFAULT 0,
  excluded_reviews INTEGER NOT NULL DEFAULT 0,
  analysis_mode TEXT NOT NULL DEFAULT 'dual',
  status TEXT NOT NULL DEFAULT 'pending',
  comparison_data TEXT,
  used_mock_classifier INTEGER NOT NULL DEFAULT 0,
  used_mock_insights INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at ON analysis_runs (created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  review_text TEXT NOT NULL,
  discovery_relevant INTEGER NOT NULL DEFAULT 0,
  discovery_reason TEXT,
  confidence REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_run_id ON reviews (run_id);

CREATE TABLE IF NOT EXISTS classifications (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  theme TEXT,
  barrier TEXT,
  behavior TEXT,
  emotion TEXT,
  segment TEXT,
  root_cause TEXT,
  unmet_need TEXT,
  classification_confidence REAL,
  evidence TEXT
);

CREATE INDEX IF NOT EXISTS idx_classifications_review_id ON classifications (review_id);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('all', 'pain')),
  executive_summary TEXT,
  top_frustrations TEXT NOT NULL DEFAULT '[]',
  listening_behaviors TEXT NOT NULL DEFAULT '[]',
  repetition_causes TEXT NOT NULL DEFAULT '[]',
  segment_challenges TEXT NOT NULL DEFAULT '{}',
  unmet_needs TEXT NOT NULL DEFAULT '[]',
  aggregation_data TEXT,
  interpretation_data TEXT,
  research_findings TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (run_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_findings_run_id ON findings (run_id);

CREATE TABLE IF NOT EXISTS representative_quotes (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  theme TEXT,
  quote_text TEXT NOT NULL,
  source TEXT,
  segment TEXT,
  confidence REAL,
  barrier TEXT,
  root_cause TEXT,
  unmet_need TEXT
);

CREATE INDEX IF NOT EXISTS idx_quotes_run_id ON representative_quotes (run_id);
CREATE INDEX IF NOT EXISTS idx_quotes_theme ON representative_quotes (theme);
CREATE INDEX IF NOT EXISTS idx_quotes_segment ON representative_quotes (segment);
CREATE INDEX IF NOT EXISTS idx_quotes_root_cause ON representative_quotes (root_cause);
CREATE INDEX IF NOT EXISTS idx_quotes_unmet_need ON representative_quotes (unmet_need);
