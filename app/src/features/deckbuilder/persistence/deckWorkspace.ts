import type { DeckFormat } from "@gatcg/shared";

export const ACTIVE_DECK_WORKSPACE_KEY = "active-deck-workspace-v1";

export interface WorkspaceCardLine {
  name: string;
  quantity: number;
}

export interface DeckWorkspace {
  version: 1;
  updatedAt: string;
  source: "builder" | "analysis" | "review" | "combo";
  title: string | null;
  sourceLabel: string | null;
  format: DeckFormat;
  championName: string | null;
  spiritName: string | null;
  main: WorkspaceCardLine[];
  material: WorkspaceCardLine[];
  sideboard: WorkspaceCardLine[];
  maybeboard: WorkspaceCardLine[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadActiveDeckWorkspace(storage: StorageLike): DeckWorkspace | null {
  try {
    const parsed = JSON.parse(storage.getItem(ACTIVE_DECK_WORKSPACE_KEY) ?? "null") as Partial<DeckWorkspace> | null;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.main) || !Array.isArray(parsed.material) || !Array.isArray(parsed.sideboard)) return null;
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      source: parsed.source === "analysis" || parsed.source === "review" || parsed.source === "combo" ? parsed.source : "builder",
      title: typeof parsed.title === "string" ? parsed.title : null,
      sourceLabel: typeof parsed.sourceLabel === "string" ? parsed.sourceLabel : null,
      format: parsed.format === "PANTHEON" ? "PANTHEON" : "STANDARD",
      championName: parsed.championName ?? null,
      spiritName: parsed.spiritName ?? null,
      main: validLines(parsed.main),
      material: validLines(parsed.material),
      sideboard: validLines(parsed.sideboard),
      maybeboard: validLines(parsed.maybeboard ?? []),
    };
  } catch {
    return null;
  }
}

export function saveActiveDeckWorkspace(storage: StorageLike, workspace: Omit<DeckWorkspace, "version" | "updatedAt">): void {
  try {
    storage.setItem(ACTIVE_DECK_WORKSPACE_KEY, JSON.stringify({ ...workspace, version: 1, updatedAt: new Date().toISOString() } satisfies DeckWorkspace));
  } catch {
    // A full or unavailable storage backend must not interrupt deck editing.
  }
}

function validLines(value: unknown[]): WorkspaceCardLine[] {
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const line = entry as Partial<WorkspaceCardLine>;
    return typeof line.name === "string" && line.name && Number.isFinite(line.quantity) && (line.quantity ?? 0) > 0
      ? [{ name: line.name, quantity: Math.floor(line.quantity!) }]
      : [];
  });
}
