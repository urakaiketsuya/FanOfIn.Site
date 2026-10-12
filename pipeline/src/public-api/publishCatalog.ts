import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { buildCatalogSnapshot, cleanupCatalogSql } from "./catalogSnapshot.js";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const args = process.argv.slice(2);
if (args.some(a => !["--local", "--remote", "--production", "--dry-run"].includes(a)) || args.includes("--local") && args.includes("--remote") || args.includes("--production") && !args.includes("--remote")) throw new Error("Invalid publication arguments");
const snapshot = buildCatalogSnapshot(JSON.parse(await readFile(path.join(root, "data/card-catalog.json"), "utf8")));
console.log(JSON.stringify(snapshot.metadata, null, 2));
if (!args.includes("--dry-run")) {
  const remote = args.includes("--remote"), production = args.includes("--production");
  const config = JSON.parse(await readFile(path.join(root, "api-worker/wrangler.jsonc"), "utf8"));
  const binding = (production ? config.env.production : config).d1_databases[0];
  if (remote && binding.database_id === "00000000-0000-0000-0000-000000000000") throw new Error("Configure the API database before publishing");
  const dir = await mkdtemp(path.join(tmpdir(), "fanofin-catalog-"));
  function execute(extra: string[]) {
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/wrangler/bin/wrangler.js"), "d1", "execute", "PUBLIC_DB", remote ? "--remote" : "--local", ...(production ? ["--env", "production"] : []), ...extra], { cwd: path.join(root, "api-worker"), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw new Error("Catalog database operation failed; prior snapshot remains available");
    return result.stdout;
  }
  try {
    const old = JSON.parse(execute(["--command", "SELECT s.metadata FROM catalog_active a JOIN catalog_snapshots s ON s.version=a.version", "--json"]))[0]?.results?.[0];
    if (old) {
      const previous = JSON.parse(old.metadata);
      if (previous.version === snapshot.metadata.version) { console.log("Catalog unchanged"); process.exitCode = 0; }
      else if (Date.parse(snapshot.metadata.generatedAt) < Date.parse(previous.generatedAt) || snapshot.metadata.cards < previous.cards * 0.9 || snapshot.metadata.editions < previous.editions * 0.9) throw new Error("Stale snapshot or unexpected catalog shrinkage; review before publication");
    }
    if (!old || JSON.parse(old.metadata).version !== snapshot.metadata.version) {
      // Each statement is bounded; the active pointer changes only after every chunk succeeds.
      const groups = [snapshot.initialize];
      for (let i = 0; i < snapshot.writes.length; i += 20) groups.push(snapshot.writes.slice(i, i + 20).join("\n"));
      groups.push(snapshot.activate);
      for (const [i, sql] of groups.entries()) { const file = path.join(dir, `${i}.sql`); await writeFile(file, sql); execute(["--file", file, "--yes"]); }
      const active = JSON.parse(execute(["--command", "SELECT version FROM catalog_active WHERE singleton=1", "--json"]))[0]?.results?.[0]?.version;
      if (active !== snapshot.metadata.version) throw new Error("Catalog activation unconfirmed; cleanup skipped");
      const file = path.join(dir, "cleanup.sql"); await writeFile(file, cleanupCatalogSql); execute(["--file", file, "--yes"]);
      console.log("Private catalog published; three recent versions retained");
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
}
