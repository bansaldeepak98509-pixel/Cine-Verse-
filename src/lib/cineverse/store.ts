import { create } from "zustand";
import { genId } from "../utils";
import { DEMO_MOVIES } from "./demo";
import type { Dict } from "./i18n";
import { getDict } from "./i18n";
import {
  applyTheme,
  loadCatalog,
  loadCategories,
  loadFavActors,
  loadLibrary,
  loadManualTv,
  loadRecentViewed,
  loadReminders,
  loadSearchHistory,
  loadSettings,
  loadTracker,
  saveCategories,
  saveFavActors,
  saveLibrary,
  saveLiveMovies,
  saveManualTv,
  saveRecentViewed,
  saveReminders,
  saveSearchHistory,
  saveSettings,
  saveTracker,
} from "./storage";
import { enrichMovie, syncLiveMovies } from "./tmdb";
import type {
  LibEntry,
  Movie,
  PageId,
  PersonResult,
  Priority,
  Reminder,
  Settings,
  TrackerItem,
  TvProgram,
} from "./types";

export interface AppState {
  ready: boolean;
  page: PageId;
  catalog: Movie[];
  library: LibEntry[];
  tracker: TrackerItem[];
  settings: Settings;
  searchHistory: string[];
  recentViewed: Movie[];
  reminders: Reminder[];
  categories: string[];
  favActors: string[];
  manualTv: TvProgram[] | null;
  online: boolean;
  syncing: boolean;
  syncError: string | null;
  toast: string | null;
  dict: Dict;
  modalMovieId: string | null;
  wizardOpen: boolean;
  moreOpen: boolean;
  person: PersonResult | null;
  personMovies: Movie[];
  confirm: { title: string; msg: string; resolve: (v: boolean) => void } | null;
  cloudTick: number;

  hydrate: () => void;
  nav: (page: PageId) => void;
  setSettings: (patch: Partial<Settings>) => void;
  showToast: (msg: string) => void;
  askConfirm: (title: string, msg: string) => Promise<boolean>;
  closeConfirm: (v: boolean) => void;
  openMovie: (id: string) => void;
  closeMovie: () => void;
  upsertLib: (id: string, data: Partial<LibEntry>) => LibEntry;
  getLib: (id: string) => LibEntry | undefined;
  findMovie: (id: string) => Movie | undefined;
  addRecent: (m: Movie) => void;
  addSearch: (q: string) => void;
  clearSearchHistory: () => void;
  addTracker: (name: string, extra?: Partial<TrackerItem>) => boolean;
  updateTracker: (id: string, patch: Partial<TrackerItem>) => void;
  removeTracker: (id: string) => void;
  setTracker: (items: TrackerItem[]) => void;
  setLibrary: (items: LibEntry[]) => void;
  setCatalog: (items: Movie[]) => void;
  mergeCatalog: (items: Movie[]) => void;
  syncCatalog: () => Promise<void>;
  setManualTv: (list: TvProgram[] | null) => void;
  addReminder: (r: Reminder) => void;
  toggleFavActor: (name: string) => void;
  setCategories: (c: string[]) => void;
  setPerson: (p: PersonResult | null, movies?: Movie[]) => void;
  setOnline: (v: boolean) => void;
  setWizard: (v: boolean) => void;
  setMore: (v: boolean) => void;
  ensureEnriched: (m: Movie) => Promise<Movie>;
  bumpCloud: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  page: "home",
  catalog: DEMO_MOVIES,
  library: [],
  tracker: [],
  settings: {
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
  },
  searchHistory: [],
  recentViewed: [],
  reminders: [],
  categories: [],
  favActors: [],
  manualTv: null,
  online: true,
  syncing: false,
  syncError: null,
  toast: null,
  dict: getDict("en"),
  modalMovieId: null,
  wizardOpen: false,
  moreOpen: false,
  person: null,
  personMovies: [],
  confirm: null,
  cloudTick: 0,

  hydrate: () => {
    const settings = loadSettings();
    const catalog = loadCatalog();
    applyTheme(settings.theme, settings.accent);
    if (typeof document !== "undefined") document.documentElement.lang = settings.lang === "hi" ? "hi" : "en";
    set({
      ready: true,
      settings,
      catalog,
      library: loadLibrary(),
      tracker: loadTracker(),
      searchHistory: loadSearchHistory(),
      recentViewed: loadRecentViewed(),
      reminders: loadReminders(),
      categories: loadCategories(),
      favActors: loadFavActors(),
      manualTv: loadManualTv(),
      dict: getDict(settings.lang),
      page: settings.landingPage || "home",
    });
  },

  nav: (page) => set({ page, moreOpen: false, person: page === "actors" ? get().person : null }),

  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    applyTheme(settings.theme, settings.accent);
    if (typeof document !== "undefined") document.documentElement.lang = settings.lang === "hi" ? "hi" : "en";
    set({ settings, dict: getDict(settings.lang), cloudTick: get().cloudTick + 1 });
  },

  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2800);
  },

  askConfirm: (title, msg) =>
    new Promise<boolean>((resolve) => {
      set({ confirm: { title, msg, resolve } });
    }),

  closeConfirm: (v) => {
    const c = get().confirm;
    if (c) c.resolve(v);
    set({ confirm: null });
  },

  openMovie: (id) => set({ modalMovieId: id }),
  closeMovie: () => set({ modalMovieId: null }),

  getLib: (id) => {
    const { library } = get();
    return library.find((x) => String(x.id) === String(id) || String(x.tmdbId) === String(id));
  },

  findMovie: (id) => {
    const { catalog, recentViewed, library } = get();
    return (
      catalog.find((x) => String(x.id) === String(id) || String(x.tmdbId) === String(id)) ||
      recentViewed.find((x) => String(x.id) === String(id)) ||
      (() => {
        const lib = library.find((x) => String(x.id) === String(id));
        if (!lib?.title) return undefined;
        return {
          id: lib.id,
          title: lib.title,
          poster: lib.poster || "",
          year: lib.year,
          rating: lib.voteAvg,
          tmdbId: typeof lib.tmdbId === "number" ? lib.tmdbId : undefined,
          genres: lib.genres || [],
          actors: [],
          platforms: [],
        } as Movie;
      })()
    );
  },

  upsertLib: (id, data) => {
    const library = [...get().library];
    let e = library.find((x) => String(x.id) === String(id) || String(x.tmdbId) === String(id));
    if (!e) {
      e = { id: String(id), tmdbId: data.tmdbId || id, addedAt: Date.now(), priority: "medium", rewatchCount: 0 };
      library.push(e);
    }
    Object.assign(e, data, { updatedAt: Date.now() });
    saveLibrary(library);
    set({ library, cloudTick: get().cloudTick + 1 });
    return e;
  },

  addRecent: (m) => {
    const list = [m, ...get().recentViewed.filter((x) => String(x.id) !== String(m.id))].slice(0, 20);
    saveRecentViewed(list);
    set({ recentViewed: list, cloudTick: get().cloudTick + 1 });
  },

  addSearch: (q) => {
    if (!q.trim()) return;
    const h = [q, ...get().searchHistory.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 12);
    saveSearchHistory(h);
    set({ searchHistory: h, cloudTick: get().cloudTick + 1 });
  },

  clearSearchHistory: () => {
    saveSearchHistory([]);
    set({ searchHistory: [], cloudTick: get().cloudTick + 1 });
  },

  addTracker: (name, extra) => {
    const cleaned = name.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      get().showToast(get().dict.nameRequired);
      return false;
    }
    if (get().tracker.some((m) => m.name.toLowerCase() === cleaned.toLowerCase())) {
      get().showToast(get().dict.alreadyInList);
      return false;
    }
    const tracker = [
      ...get().tracker,
      {
        id: genId(),
        name: cleaned,
        watched: false,
        favorite: false,
        addedAt: Date.now(),
        rewatchCount: 0,
        ...extra,
      },
    ];
    saveTracker(tracker);
    set({ tracker, cloudTick: get().cloudTick + 1 });
    return true;
  },

  updateTracker: (id, patch) => {
    const tracker = get().tracker.map((m) => (m.id === id ? { ...m, ...patch } : m));
    saveTracker(tracker);
    set({ tracker, cloudTick: get().cloudTick + 1 });
  },

  removeTracker: (id) => {
    const tracker = get().tracker.filter((m) => m.id !== id);
    saveTracker(tracker);
    set({ tracker, cloudTick: get().cloudTick + 1 });
  },

  setTracker: (items) => {
    saveTracker(items);
    set({ tracker: items, cloudTick: get().cloudTick + 1 });
  },

  setLibrary: (items) => {
    saveLibrary(items);
    set({ library: items, cloudTick: get().cloudTick + 1 });
  },

  setCatalog: (items) => {
    saveLiveMovies(items);
    set({ catalog: items });
  },

  mergeCatalog: (items) => {
    const byKey = new Map<string, Movie>();
    [...items, ...get().catalog].forEach((m) => {
      const k = (m.title || "").toLowerCase();
      if (!byKey.has(k)) byKey.set(k, m);
    });
    const catalog = [...byKey.values()];
    catalog.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    saveLiveMovies(catalog);
    set({ catalog });
  },

  syncCatalog: async () => {
    const { settings, showToast, dict, mergeCatalog } = get();
    if (!settings.apiKey) {
      showToast(dict.noApiKey);
      set({ page: "settings" });
      return;
    }
    set({ syncing: true, syncError: null });
    showToast(dict.syncing);
    try {
      const incoming = await syncLiveMovies(settings.apiKey);
      const titles = new Set(incoming.map((m) => (m.title || "").toLowerCase()));
      const keep = DEMO_MOVIES.filter((d) => !titles.has(d.title.toLowerCase()));
      const catalog = [...incoming, ...keep].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      saveLiveMovies(catalog);
      mergeCatalog(catalog);
      set({ catalog, syncing: false });
      showToast(`${dict.synced} · ${incoming.length}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : dict.apiError;
      set({ syncing: false, syncError: msg });
      showToast(msg);
    }
  },

  setManualTv: (list) => {
    saveManualTv(list);
    set({ manualTv: list, cloudTick: get().cloudTick + 1 });
  },

  addReminder: (r) => {
    const reminders = [...get().reminders.filter((x) => x.id !== r.id), r];
    saveReminders(reminders);
    set({ reminders, cloudTick: get().cloudTick + 1 });
  },

  toggleFavActor: (name) => {
    const cur = get().favActors;
    const favActors = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
    saveFavActors(favActors);
    set({ favActors, cloudTick: get().cloudTick + 1 });
  },

  setCategories: (c) => {
    saveCategories(c);
    set({ categories: c, cloudTick: get().cloudTick + 1 });
  },

  setPerson: (p, movies = []) => set({ person: p, personMovies: movies }),
  setOnline: (v) => set({ online: v }),
  setWizard: (v) => set({ wizardOpen: v }),
  setMore: (v) => set({ moreOpen: v }),

  bumpCloud: () => set({ cloudTick: get().cloudTick + 1 }),

  ensureEnriched: async (m) => {
    const { settings } = get();
    if (!settings.apiKey || !m.tmdbId) return m;
    const enriched = await enrichMovie(settings.apiKey, { ...m });
    const catalog = get().catalog;
    const idx = catalog.findIndex((x) => String(x.id) === String(enriched.id));
    if (idx >= 0) {
      const next = [...catalog];
      next[idx] = enriched;
      set({ catalog: next });
    } else {
      set({ catalog: [enriched, ...catalog] });
    }
    return enriched;
  },
}));

export function libFor(id: string, library: LibEntry[]) {
  return library.find((x) => String(x.id) === String(id) || String(x.tmdbId) === String(id));
}

export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
