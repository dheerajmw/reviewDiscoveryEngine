import { createClient, type Client } from "@libsql/client";
import { mkdirSync, readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";

export type TursoClient = Client;

let client: TursoClient | null = null;
let schemaReady: Promise<void> | null = null;

function resolveDatabaseUrl(): string {
  const configured = process.env.TURSO_DATABASE_URL?.trim();
  if (configured) return configured;
  return `file:${join(process.cwd(), "data/research.db")}`;
}

export function isTursoConfigured(): boolean {
  return true;
}

function ensureDataDir(url: string): void {
  if (!url.startsWith("file:")) return;
  const filePath = url.replace(/^file:/, "");
  mkdirSync(dirname(filePath), { recursive: true });
}

export function createTursoClient(): TursoClient {
  const url = resolveDatabaseUrl();
  ensureDataDir(url);
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (url.startsWith("libsql://") && !authToken) {
    throw new Error(
      "TURSO_AUTH_TOKEN is required when using a remote libsql:// URL.",
    );
  }

  return createClient({
    url,
    authToken: authToken || undefined,
  });
}

export function getTursoClient(): TursoClient {
  if (!client) {
    client = createTursoClient();
  }
  return client;
}

function stripSqlComments(statement: string): string {
  return statement
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("--")) return "";
      const inline = line.indexOf("--");
      if (inline > 0) return line.slice(0, inline).trimEnd();
      return line;
    })
    .join("\n")
    .trim();
}

function parseMigrationStatements(sql: string): string[] {
  return sql
    .split(";")
    .map(stripSqlComments)
    .filter((statement) => statement.length > 0);
}

async function ensureMigrationsTable(db: TursoClient): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

async function isMigrationApplied(
  db: TursoClient,
  migrationId: string,
): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM schema_migrations WHERE id = ? LIMIT 1`,
    args: [migrationId],
  });
  return result.rows.length > 0;
}

async function markMigrationApplied(
  db: TursoClient,
  migrationId: string,
): Promise<void> {
  await db.execute({
    sql: `INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)`,
    args: [migrationId],
  });
}

async function tableExists(db: TursoClient, table: string): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
    args: [table],
  });
  return result.rows.length > 0;
}

async function columnExists(
  db: TursoClient,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => {
    const record = row as Record<string, unknown>;
    return record.name === column || record[1] === column;
  });
}

/** Legacy DBs created before schema_migrations — infer already-applied migrations. */
async function bootstrapLegacyMigrations(
  db: TursoClient,
  files: string[],
): Promise<void> {
  const countResult = await db.execute(
    `SELECT COUNT(*) AS c FROM schema_migrations`,
  );
  const row = countResult.rows[0] as Record<string, unknown> | undefined;
  const migrationCount = Number(row?.c ?? row?.[0] ?? 0);
  if (migrationCount > 0) return;

  if (!(await tableExists(db, "analysis_runs"))) return;

  for (const file of files) {
    if (file.startsWith("001_")) {
      await markMigrationApplied(db, file);
      continue;
    }
    if (file.startsWith("002_") && (await tableExists(db, "classification_cache"))) {
      await markMigrationApplied(db, file);
      continue;
    }
    if (
      file.startsWith("003_") &&
      (await columnExists(db, "representative_quotes", "classification_reasons"))
    ) {
      await markMigrationApplied(db, file);
    }
  }
}

async function executeMigrationStatement(
  db: TursoClient,
  statement: string,
): Promise<void> {
  const addColumn = statement.match(
    /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i,
  );
  if (addColumn) {
    const [, table, column] = addColumn;
    if (table && column && (await columnExists(db, table, column))) {
      return;
    }
  }
  await db.execute(statement);
}

async function runMigrations(db: TursoClient): Promise<void> {
  await ensureMigrationsTable(db);

  const migrationsDir = join(process.cwd(), "turso/migrations");
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  await bootstrapLegacyMigrations(db, files);

  for (const file of files) {
    if (await isMigrationApplied(db, file)) continue;

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const statements = parseMigrationStatements(sql);

    for (const statement of statements) {
      await executeMigrationStatement(db, statement);
    }

    await markMigrationApplied(db, file);
  }
}

/** Ensure schema exists (idempotent). Call once per process before queries. */
export async function ensureTursoSchema(): Promise<TursoClient> {
  const db = getTursoClient();
  if (!schemaReady) {
    schemaReady = runMigrations(db).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
  return db;
}

export function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string {
  return JSON.stringify(value);
}

export function boolFromDb(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

export function boolToDb(value: boolean): number {
  return value ? 1 : 0;
}

export function newId(): string {
  return crypto.randomUUID();
}
