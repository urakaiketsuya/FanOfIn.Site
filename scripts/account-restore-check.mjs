import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const migrations = new URL('../account-worker/migrations/', import.meta.url);
const quote = value => `"${value.replaceAll('"', '""')}"`;

// Derive the recovery contract from all migrations, so new features cannot be
// silently omitted from the drill. Queries return counts, never account data.
export function restoreChecks() {
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
      db.exec(readFileSync(new URL(file, migrations), 'utf8'));
    }
    const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    const queries = [];
    for (const { name } of tables) {
      const table = quote(name);
      const columns = db.prepare(`PRAGMA table_info(${table})`).all();
      // Qualify names: SQLite can otherwise treat an unknown quoted name as a string.
      queries.push(`SELECT ${columns.map(c => `c.${quote(c.name)}`).join(', ')} FROM ${table} c LIMIT 0;`);
      const groups = new Map();
      for (const fk of db.prepare(`PRAGMA foreign_key_list(${table})`).all()) {
        if (!groups.has(fk.id)) groups.set(fk.id, []);
        groups.get(fk.id).push(fk);
      }
      for (const keys of groups.values()) {
        keys.sort((a, b) => a.seq - b.seq);
        const parent = quote(keys[0].table);
        const primary = db.prepare(`PRAGMA table_info(${parent})`).all().filter(c => c.pk).sort((a, b) => a.pk - b.pk);
        const present = keys.map(k => `c.${quote(k.from)} IS NOT NULL`).join(' AND ');
        const match = keys.map((k, i) => `p.${quote(k.to ?? primary[i].name)} = c.${quote(k.from)}`).join(' AND ');
        queries.push(`SELECT COUNT(*) AS orphan_count FROM ${table} c WHERE ${present} AND NOT EXISTS (SELECT 1 FROM ${parent} p WHERE ${match});`);
      }
    }
    return queries;
  } finally {
    db.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(restoreChecks().join('\n'));
}
