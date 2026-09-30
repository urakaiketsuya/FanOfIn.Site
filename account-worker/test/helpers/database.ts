import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import type { Env } from "../../src/auth";

/** Shared SQLite adapter: real migrations and transactional batches, with an interleaving hook. */
export function databaseFixture() {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter(file => file.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(file, dir), "utf8"));
  let beforeBatch: (() => void) | undefined;
  const prepare = (sql: string) => {
    let args: unknown[] = [];
    const execute = () => {
      const statement = db.prepare(sql);
      if (statement.columns().length) return { results: statement.all(...args as never[]), meta: { changes: 0 } };
      return { results: [], meta: statement.run(...args as never[]) };
    };
    return {
      bind(...values: unknown[]) { args = values; return this; },
      async first() { return db.prepare(sql).get(...args as never[]) ?? null; },
      async all() { return execute(); },
      run: execute,
    };
  };
  const env = { ACCOUNT_DB: { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    const hook = beforeBatch; beforeBatch = undefined; hook?.();
    db.exec("BEGIN");
    try { const results = statements.map(statement => statement.run()); db.exec("COMMIT"); return results; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  } } } as unknown as Env;
  return { db, env, beforeBatch(hook: () => void) { beforeBatch = hook; } };
}
