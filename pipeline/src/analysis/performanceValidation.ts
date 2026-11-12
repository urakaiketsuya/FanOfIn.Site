/** Offline validation only. Nothing here is a published deck-power score. */
export interface PerformanceRow {
  id: string; event: string; date: string; player: string; champion: string; family: string; identity: string;
  wins: number; losses: number; ties: number; diao: number[]; analytics: (number | null)[];
}
const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const target = (r: PerformanceRow) => (r.wins + r.ties / 2) / (r.wins + r.losses + r.ties);
const clip = (n: number) => Math.max(.01, Math.min(.99, n));
export function chronologicalSplit(rows: PerformanceRow[]) {
  const dates = [...new Set(rows.map(r => r.date.slice(0, 10)))].sort();
  if (dates.length < 3) throw new Error('At least three distinct event dates are required.');
  const cutoff = dates[Math.min(dates.length - 1, Math.floor(dates.length * .7))];
  return { cutoff, train: rows.filter(r => r.date.slice(0, 10) < cutoff), test: rows.filter(r => r.date.slice(0, 10) >= cutoff) };
}
function baseline(train: PerformanceRow[]) {
  const global = mean(train.map(target));
  const maps = ['champion', 'family', 'player'].map(key => {
    const map = new Map<string, { sum: number; n: number }>();
    for (const r of train) { const value = r[key as 'champion']; const s = map.get(value) ?? { sum: 0, n: 0 }; s.sum += target(r); s.n++; map.set(value, s); }
    return map;
  });
  return (row: PerformanceRow, training = false) => {
    const prior = training && train.length > 1 ? (global * train.length - target(row)) / (train.length - 1) : global;
    const values = [row.champion, row.family, row.player].map((key, i) => {
      const s = maps[i].get(key); const n = (s?.n ?? 0) - Number(training);
      return ((s?.sum ?? 0) - (training ? target(row) : 0) + 20 * prior) / (Math.max(0, n) + 20);
    });
    return clip(.25 * values[0] + .5 * values[1] + .25 * values[2]);
  };
}
/** Ridge residual model; transforms and imputation are fitted exclusively on training rows. */
function fit(train: PerformanceRow[], features: (r: PerformanceRow) => (number | null)[]) {
  const base = baseline(train), raw = train.map(features), width = raw[0].length;
  const means = Array.from({ length: width }, (_, j) => mean(raw.flatMap(x => x[j] === null ? [] : [x[j]!] )));
  const expand = (r: PerformanceRow) => features(r).flatMap((v, j) => [v ?? means[j], Number(v === null)]);
  const expanded = train.map(expand), size = width * 2;
  const centers = Array.from({ length: size }, (_, j) => mean(expanded.map(x => x[j])));
  const scales = centers.map((m, j) => Math.sqrt(mean(expanded.map(x => (x[j] - m) ** 2))) || 1);
  const transform = (r: PerformanceRow) => expand(r).map((v, j) => (v - centers[j]) / scales[j]);
  const matrix = Array.from({ length: size }, (_, i) => Array.from({ length: size + 1 }, (_, j) => i === j ? train.length * .1 : 0));
  for (const row of train) {
    const x = transform(row), residual = target(row) - base(row, true);
    for (let i = 0; i < size; i++) { for (let j = 0; j < size; j++) matrix[i][j] += x[i] * x[j]; matrix[i][size] += x[i] * residual; }
  }
  for (let i = 0; i < size; i++) {
    const divisor = matrix[i][i]; for (let j = i; j <= size; j++) matrix[i][j] /= divisor;
    for (let k = 0; k < size; k++) if (k !== i) { const factor = matrix[k][i]; for (let j = i; j <= size; j++) matrix[k][j] -= factor * matrix[i][j]; }
  }
  const coefficients = matrix.map(row => row[size]);
  return (row: PerformanceRow) => clip(base(row) + transform(row).reduce((sum, x, j) => sum + x * coefficients[j], 0));
}
export function evaluatePerformance(rows: PerformanceRow[]) {
  const { cutoff, train, test } = chronologicalSplit(rows);
  const models = { baseline: baseline(train), diao: fit(train, r => r.diao), analytics: fit(train, r => r.analytics), combined: fit(train, r => [...r.diao, ...r.analytics]) };
  const players = new Set(train.map(r => r.player)), identities = new Set(train.map(r => r.identity));
  const evaluate = (sample: PerformanceRow[]) => {
    if (!sample.length) return { decks: 0, events: 0, models: null };
    const scores = Object.fromEntries(Object.entries(models).map(([name, predict]) => {
      const pairs = sample.map(r => ({ row: r, p: predict(r), y: target(r) }));
      const byEvent = new Map<string, number[]>();
      for (const { row, p, y } of pairs) { const d = (models.baseline(row) - y) ** 2 - (p - y) ** 2; const group = byEvent.get(row.event) ?? []; group.push(d); byEvent.set(row.event, group); }
      const clusters = [...byEvent.values()]; let seed = 713;
      const boot = Array.from({ length: 400 }, () => { let sum = 0, n = 0; for (let i = 0; i < clusters.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const group = clusters[Math.floor(seed / 4294967296 * clusters.length)]; sum += group.reduce((a, b) => a + b, 0); n += group.length; } return sum / n; }).sort((a, b) => a - b);
      return [name, { meanSquaredDeckRateError: mean(pairs.map(({ p, y }) => (p - y) ** 2)), meanAbsoluteError: mean(pairs.map(({ p, y }) => Math.abs(p - y))), improvement95: clusters.length >= 20 ? [boot[10], boot[389]] : null,
        calibration: Array.from({ length: 10 }, (_, i) => { const bucket = pairs.filter(({ p }) => Math.floor(p * 10) === i); return { from: i / 10, decks: bucket.length, predicted: bucket.length ? mean(bucket.map(x => x.p)) : null, observed: bucket.length ? mean(bucket.map(x => x.y)) : null }; }) }];
    }));
    return { decks: sample.length, events: new Set(sample.map(r => r.event)).size, models: scores };
  };
  return { cutoff, trainingDecks: train.length, holdout: evaluate(test), unseenPlayers: evaluate(test.filter(r => !players.has(r.player))), unseenExactDecks: evaluate(test.filter(r => !identities.has(r.identity))), unseenPlayersAndDecks: evaluate(test.filter(r => !players.has(r.player) && !identities.has(r.identity))) };
}
