import { genId } from "../utils";
import { DEMO_MOVIES } from "./demo";
import type {
  BackupV3,
  LibEntry,
  Movie,
  PageId,
  Reminder,
  Settings,
  ThemePref,
  TrackerItem,
  TvProgram,
} from "./types";
import { ACCENT_HEX, STORAGE_KEYS } from "./types";

function hasLS(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasLS()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!hasLS()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function loadLibrary(): LibEntry[] {
  const a = readJson<unknown>(STORAGE_KEYS.library, []);
  if (!Array.isArray(a)) return [];
  return a
    .filter((x) => x && typeof x === "object")
    .map((raw) => {
      const m = raw as Partial<LibEntry>;
      return {
        id: String(m.id ?? genId()),
        tmdbId: m.tmdbId,
        title: typeof m.title === "string" ? m.title : undefined,
        poster: typeof m.poster === "string" ? m.poster : undefined,
        year: m.year ?? null,
        voteAvg: typeof m.voteAvg === "number" ? m.voteAvg : undefined,
        inWatchlist: !!m.inWatchlist,
        watched: !!m.watched,
        watchedDate: m.watchedDate ?? null,
        favorite: !!m.favorite,
        myRating: typeof m.myRating === "number" ? m.myRating : undefined,
        notes: typeof m.notes === "string" ? m.notes : undefined,
        addedAt: typeof m.addedAt === "number" ? m.addedAt : Date.now(),
        updatedAt: typeof m.updatedAt === "number" ? m.updatedAt : Date.now(),
        priority: m.priority === "high" || m.priority === "low" || m.priority === "medium" ? m.priority : "medium",
        category: typeof m.category === "string" ? m.category : undefined,
        rewatchCount: typeof m.rewatchCount === "number" ? m.rewatchCount : 0,
        runtime: typeof m.runtime === "number" ? m.runtime : undefined,
        genres: Array.isArray(m.genres) ? m.genres.filter((g) => typeof g === "string") : undefined,
        director: typeof m.director === "string" ? m.director : undefined,
        sortOrder: typeof m.sortOrder === "number" ? m.sortOrder : undefined,
      } satisfies LibEntry;
    });
}

export function saveLibrary(library: LibEntry[]) {
  writeJson(STORAGE_KEYS.library, library);
}

export function loadTracker(): TrackerItem[] {
  const p = readJson<unknown>(STORAGE_KEYS.tracker, []);
  if (!Array.isArray(p)) return [];
  return p
    .filter((x) => x && typeof x === "object")
    .map((raw) => {
      const m = raw as Record<string, unknown>;
      const name = String(m.name || m.title || "Untitled");
      return {
        id: String(m.id || genId()),
        name,
        watched: !!m.watched,
        favorite: !!m.favorite,
        addedAt: typeof m.addedAt === "number" ? m.addedAt : Date.now(),
        rating: typeof m.rating === "number" ? m.rating : undefined,
        notes: typeof m.notes === "string" ? m.notes : undefined,
        watchedDate: typeof m.watchedDate === "string" ? m.watchedDate : undefined,
        rewatchCount: typeof m.rewatchCount === "number" ? m.rewatchCount : 0,
        runtime: typeof m.runtime === "number" ? m.runtime : undefined,
        genres: Array.isArray(m.genres) ? (m.genres as string[]) : undefined,
        tmdbId: typeof m.tmdbId === "number" ? m.tmdbId : undefined,
        poster: typeof m.poster === "string" ? m.poster : undefined,
      } satisfies TrackerItem;
    });
}

export function saveTracker(items: TrackerItem[]) {
  writeJson(STORAGE_KEYS.tracker, items);
}

export function loadCatalog(): Movie[] {
  const live = readJson<unknown>(STORAGE_KEYS.liveMovies, []);
  if (Array.isArray(live) && live.length) {
    const mapped = live
      .filter((x) => x && typeof x === "object" && typeof (x as Movie).title === "string")
      .map((raw) => normalizeMovie(raw as Partial<Movie>));
    const titles = new Set(mapped.map((m) => (m.title || "").toLowerCase()));
    const keep = DEMO_MOVIES.filter((d) => !titles.has((d.title || "").toLowerCase()));
    return [...mapped, ...keep];
  }
  return [...DEMO_MOVIES];
}

export function saveLiveMovies(catalog: Movie[]) {
  writeJson(STORAGE_KEYS.liveMovies, catalog);
}

function normalizeMovie(m: Partial<Movie>): Movie {
  return {
    id: String(m.id ?? (m.tmdbId ? `tmdb-${m.tmdbId}` : genId())),
    tmdbId: m.tmdbId,
    title: String(m.title || "Untitled"),
    originalTitle: m.originalTitle,
    poster: typeof m.poster === "string" ? m.poster : "",
    backdrop: typeof m.backdrop === "string" ? m.backdrop : undefined,
    releaseDate: m.releaseDate,
    year: m.year ?? null,
    runtime: m.runtime,
    genres: Array.isArray(m.genres) ? m.genres : [],
    language: m.language,
    rating: m.rating,
    voteCount: m.voteCount,
    director: m.director,
    writers: m.writers,
    actors: Array.isArray(m.actors) ? m.actors : [],
    description: m.description,
    tagline: m.tagline,
    platforms: Array.isArray(m.platforms) ? m.platforms : [],
    isFree: !!m.isFree,
    popularity: m.popularity,
    trailerUrl: m.trailerUrl,
    trailerKey: m.trailerKey,
    imdbId: m.imdbId,
    mediaType: m.mediaType === "tv" ? "tv" : "movie",
  };
}

export function loadSearchHistory(): string[] {
  const h = readJson<unknown>(STORAGE_KEYS.searchHist, []);
  return Array.isArray(h) ? h.filter((x) => typeof x === "string").slice(0, 12) : [];
}

export function saveSearchHistory(h: string[]) {
  writeJson(STORAGE_KEYS.searchHist, h.slice(0, 12));
}

export function loadRecentViewed(): Movie[] {
  const h = readJson<unknown>(STORAGE_KEYS.recentView, []);
  if (!Array.isArray(h)) return [];
  return h
    .filter((x) => x && typeof x === "object")
    .map((x) => normalizeMovie(x as Partial<Movie>))
    .slice(0, 20);
}

export function saveRecentViewed(list: Movie[]) {
  writeJson(
    STORAGE_KEYS.recentView,
    list.slice(0, 20).map((m) => ({
      id: m.id,
      title: m.title,
      poster: m.poster,
      year: m.year,
      rating: m.rating,
      tmdbId: m.tmdbId,
      backdrop: m.backdrop,
      genres: m.genres,
    })),
  );
}

export function loadManualTv(): TvProgram[] | null {
  const a = readJson<unknown>(STORAGE_KEYS.manualTv, null);
  if (!Array.isArray(a) || !a.length) return null;
  return a
    .filter((x) => x && typeof x === "object")
    .map((raw) => {
      const x = raw as Record<string, unknown>;
      return {
        channel: String(x.channel || "Channel"),
        movieTitle: String(x.movieTitle || x.title || x.name || "Program"),
        start: String(x.start || x.airtime || "00:00"),
        end: x.end ? String(x.end) : "",
        logo: x.logo ? String(x.logo) : "",
        url: x.url ? String(x.url) : "",
        scheduleUrl: x.scheduleUrl ? String(x.scheduleUrl) : "",
      };
    })
    .filter((x) => x.start);
}

export function saveManualTv(list: TvProgram[] | null) {
  if (!hasLS()) return;
  if (!list) localStorage.removeItem(STORAGE_KEYS.manualTv);
  else writeJson(STORAGE_KEYS.manualTv, list);
}

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  accent: "crimson",
  lang: "en",
  landingPage: "home",
  defaultSort: "popularity",
  preferredGenres: [],
  preferredLanguage: "Hindi",
  preferredPlatforms: [],
  sidebarCollapsed: false,
  apiKey: "",
  tvUrl: "",
};

export function loadSettings(): Settings {
  if (!hasLS()) return { ...DEFAULT_SETTINGS };
  const themeRaw = (localStorage.getItem(STORAGE_KEYS.theme) || "dark") as ThemePref;
  const theme: ThemePref = themeRaw === "light" || themeRaw === "oled" || themeRaw === "dark" ? themeRaw : "dark";
  const apiKey = localStorage.getItem(STORAGE_KEYS.tmdbKey) || "";
  const tvUrl = localStorage.getItem(STORAGE_KEYS.tvUrl) || "";
  const extra = readJson<Partial<Settings>>(STORAGE_KEYS.settings, {});
  const landing = extra.landingPage;
  const validPages: PageId[] = [
    "home",
    "search",
    "movies",
    "bollywood",
    "free",
    "upcoming",
    "tv",
    "actors",
    "watchlist",
    "favorites",
    "tracker",
    "calendar",
    "timeline",
    "profile",
    "settings",
  ];
  return {
    ...DEFAULT_SETTINGS,
    ...extra,
    theme: extra.theme || theme,
    apiKey: extra.apiKey ?? apiKey,
    tvUrl: extra.tvUrl ?? tvUrl,
    landingPage: landing && validPages.includes(landing) ? landing : "home",
    accent: extra.accent && extra.accent in ACCENT_HEX ? extra.accent : "crimson",
    lang: extra.lang === "hi" ? "hi" : extra.lang === "en" ? "en" : "en",
  };
}

export function saveSettings(s: Settings) {
  if (!hasLS()) return;
  writeJson(STORAGE_KEYS.settings, s);
  localStorage.setItem(STORAGE_KEYS.theme, s.theme);
  localStorage.setItem(STORAGE_KEYS.tmdbKey, s.apiKey);
  localStorage.setItem(STORAGE_KEYS.tvUrl, s.tvUrl);
}

export function loadReminders(): Reminder[] {
  const a = readJson<unknown>(STORAGE_KEYS.reminders, []);
  if (!Array.isArray(a)) return [];
  return a.filter((x) => x && typeof x === "object" && typeof (x as Reminder).id === "string") as Reminder[];
}

export function saveReminders(list: Reminder[]) {
  writeJson(STORAGE_KEYS.reminders, list);
}

export function loadCategories(): string[] {
  const a = readJson<unknown>(STORAGE_KEYS.categories, ["Weekend", "Family", "Date night"]);
  return Array.isArray(a) ? a.filter((x) => typeof x === "string") : ["Weekend", "Family", "Date night"];
}

export function saveCategories(list: string[]) {
  writeJson(STORAGE_KEYS.categories, list);
}

export function loadFavActors(): string[] {
  const a = readJson<unknown>(STORAGE_KEYS.favActors, []);
  return Array.isArray(a) ? a.filter((x) => typeof x === "string") : [];
}

export function saveFavActors(list: string[]) {
  writeJson(STORAGE_KEYS.favActors, list);
}

export function applyTheme(theme: ThemePref, accent: Settings["accent"]) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.setProperty("--cv-accent", ACCENT_HEX[accent]);
  const meta = document.querySelector('meta[name="theme-color"]');
  const bg = theme === "light" ? "#f4f1ea" : theme === "oled" ? "#000000" : "#07070b";
  if (meta) meta.setAttribute("content", bg);
}

export function buildBackup(data: {
  library: LibEntry[];
  tracker: TrackerItem[];
  searchHistory: string[];
  recentViewed: Movie[];
  settings: Settings;
  reminders: Reminder[];
  categories: string[];
  favActors?: string[];
  manualTv?: TvProgram[] | null;
}): BackupV3 {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    library: data.library,
    tracker: data.tracker,
    searchHistory: data.searchHistory,
    recentViewed: data.recentViewed,
    settings: data.settings,
    reminders: data.reminders,
    categories: data.categories,
    favActors: data.favActors,
    manualTv: data.manualTv,
  };
}

export function parseBackup(raw: unknown): BackupV3 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.library) && !Array.isArray(o.tracker)) return null;
  return {
    version: typeof o.version === "number" ? o.version : 3,
    exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : new Date().toISOString(),
    library: Array.isArray(o.library) ? (o.library as LibEntry[]) : [],
    tracker: Array.isArray(o.tracker) ? (o.tracker as TrackerItem[]) : [],
    searchHistory: Array.isArray(o.searchHistory) ? (o.searchHistory as string[]) : [],
    recentViewed: Array.isArray(o.recentViewed) ? (o.recentViewed as Movie[]) : [],
    settings: o.settings && typeof o.settings === "object" ? (o.settings as Partial<Settings>) : undefined,
    reminders: Array.isArray(o.reminders) ? (o.reminders as Reminder[]) : [],
    categories: Array.isArray(o.categories) ? (o.categories as string[]) : [],
    favActors: Array.isArray(o.favActors) ? (o.favActors as string[]) : [],
    manualTv: Array.isArray(o.manualTv) ? (o.manualTv as TvProgram[]) : null,
  };
}

export function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function resetKeys(keys: (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS][]) {
  if (!hasLS()) return;
  keys.forEach((k) => localStorage.removeItem(k));
}
