import { pullCloud, pushCloud } from "./cloud";
import { buildBackup, parseBackup, saveFavActors, saveRecentViewed, saveReminders, saveSearchHistory } from "./storage";
import { useApp } from "./store";
import type { BackupV3, LibEntry, TrackerItem } from "./types";

function newer(a?: number, b?: number) {
  return (a || 0) >= (b || 0);
}

function mergeLibrary(local: LibEntry[], cloud: LibEntry[]): LibEntry[] {
  const map = new Map<string, LibEntry>();
  cloud.forEach((x) => map.set(String(x.id), x));
  local.forEach((x) => {
    const prev = map.get(String(x.id));
    if (!prev || newer(x.updatedAt || x.addedAt, prev.updatedAt || prev.addedAt)) map.set(String(x.id), x);
  });
  return [...map.values()];
}

function mergeTracker(local: TrackerItem[], cloud: TrackerItem[]): TrackerItem[] {
  const map = new Map<string, TrackerItem>();
  const key = (x: TrackerItem) => (x.name || "").toLowerCase();
  cloud.forEach((x) => map.set(key(x) || x.id, x));
  local.forEach((x) => {
    const k = key(x) || x.id;
    const prev = map.get(k);
    if (!prev || newer(x.addedAt, prev.addedAt)) map.set(k, { ...prev, ...x });
  });
  return [...map.values()];
}

function uniqStrings(a: string[], b: string[], max: number) {
  const out: string[] = [];
  const seen = new Set<string>();
  [...a, ...b].forEach((s) => {
    const k = s.toLowerCase();
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(s);
  });
  return out.slice(0, max);
}

export function snapshotFromStore(): BackupV3 {
  const s = useApp.getState();
  return buildBackup({
    library: s.library,
    tracker: s.tracker,
    searchHistory: s.searchHistory,
    recentViewed: s.recentViewed,
    settings: s.settings,
    reminders: s.reminders,
    categories: s.categories,
    favActors: s.favActors,
    manualTv: s.manualTv,
  });
}

export function applyBackupToStore(data: BackupV3, { mergeLocal }: { mergeLocal: boolean }) {
  const s = useApp.getState();
  const parsed = parseBackup(data);
  if (!parsed) return;
  const library = mergeLocal ? mergeLibrary(s.library, parsed.library) : parsed.library;
  const tracker = mergeLocal ? mergeTracker(s.tracker, parsed.tracker) : parsed.tracker;
  s.setLibrary(library);
  s.setTracker(tracker);
  if (parsed.searchHistory?.length) {
    const h = mergeLocal ? uniqStrings(s.searchHistory, parsed.searchHistory, 12) : parsed.searchHistory;
    saveSearchHistory(h);
    useApp.setState({ searchHistory: h });
  }
  if (parsed.recentViewed?.length) {
    const byId = new Map(parsed.recentViewed.map((m) => [String(m.id), m]));
    s.recentViewed.forEach((m) => {
      if (!byId.has(String(m.id))) byId.set(String(m.id), m);
    });
    const recent = [...byId.values()].slice(0, 20);
    saveRecentViewed(recent);
    useApp.setState({ recentViewed: recent });
  }
  if (parsed.settings) s.setSettings(parsed.settings);
  if (parsed.reminders) {
    saveReminders(parsed.reminders);
    useApp.setState({ reminders: parsed.reminders });
  }
  if (parsed.categories?.length) s.setCategories(parsed.categories);
  if (parsed.favActors) {
    saveFavActors(parsed.favActors);
    useApp.setState({ favActors: parsed.favActors });
  }
  if (parsed.manualTv) s.setManualTv(parsed.manualTv);
}

function isUnauthorized(e: unknown) {
  return e instanceof Error && (e.message === "Unauthorized" || (e as { status?: number }).status === 401);
}

export async function syncFromCloud(): Promise<"empty" | "merged" | "error"> {
  try {
    const remote = await pullCloud();
    if (!remote?.payload) {
      await pushCloud({ data: snapshotFromStore() });
      return "empty";
    }
    applyBackupToStore(remote.payload, { mergeLocal: true });
    await pushCloud({ data: snapshotFromStore() });
    return "merged";
  } catch (e) {
    if (isUnauthorized(e)) return "error";
    return "error";
  }
}

export async function saveToCloud(): Promise<boolean> {
  try {
    await pushCloud({ data: snapshotFromStore() });
    return true;
  } catch (e) {
    if (isUnauthorized(e)) return false;
    return false;
  }
}
