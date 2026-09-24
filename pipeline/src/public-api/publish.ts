import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import type { ArchetypeData, CardStatsData } from "@gatcg/shared";
import { buildSnapshot, snapshotSql, cleanupSql } from "./snapshot.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const args = process.argv.slice(2);
if (args.some(arg => !["--local", "--remote", "--production", "--dry-run"].includes(arg)) ||
    args.includes("--local") && args.includes("--remote") ||
    args.includes("--production") && !args.includes("--remote")) {
  throw new Error("Usage: pipeline:api:publish [--local | --remote [--production]] [--dry-run]");
}
const remote = args.includes("--remote");
const production = args.includes("--production");
if (remote) {
  const config = JSON.parse(await readFile(path.join(root, "api-worker/wrangler.jsonc"), "utf8"));
  const binding = (production ? config.env.production : config).d1_databases[0];
  if (binding.database_id === "00000000-0000-0000-0000-000000000000") throw new Error("Configure a dedicated D1 database ID before remote publication");
}
const cards: CardStatsData = JSON.parse(await readFile(path.join(root, "data/analysis/cards.json"), "utf8"));
const archetypes: ArchetypeData = JSON.parse(await readFile(path.join(root, "data/analysis/archetypes.json"), "utf8"));
const snapshot = buildSnapshot(cards, archetypes);
console.log(JSON.stringify({ target: remote ? (production ? "production" : "remote development") : "local", ...snapshot.metadata }, null, 2));
if (!args.includes("--dry-run")) {
  const directory = await mkdtemp(path.join(tmpdir(), "fanofin-api-"));
  function execute(extra: string[]): string {
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/wrangler/bin/wrangler.js"),
      "d1", "execute", "PUBLIC_DB", remote ? "--remote" : "--local", ...(production ? ["--env", "production"] : []), ...extra],
    { cwd: path.join(root, "api-worker"), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr + result.stdout);
    return result.stdout;
  }
  try {
    const sqlPath = path.join(directory, "publish.sql");
    await writeFile(sqlPath, snapshotSql(snapshot));
    execute(["--file", sqlPath, "--yes"]);
    const output = JSON.parse(execute(["--command", "SELECT version FROM api_active WHERE singleton=1", "--json"]));
    if (output[0]?.results?.[0]?.version !== snapshot.metadata.datasetVersion) throw new Error("Snapshot was not activated; cleanup skipped");
    await writeFile(sqlPath, cleanupSql);
    execute(["--file", sqlPath, "--yes"]);
    console.log("Published and pruned stale snapshots.");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
