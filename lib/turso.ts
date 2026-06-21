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

async function runMigrations(db: TursoClient): Promise<void> {
  const migrationsDir = join(process.cwd(), "turso/migrations");
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const statements = parseMigrationStatements(sql);

    for (const statement of statements) {
      await db.execute(statement);
    }
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
