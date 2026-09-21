import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Clapperboard,
  Heart,
  Home,
  IndianRupee,
  ListChecks,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Star,
  Sun,
  Tv,
  UserRound,
  WifiOff,
  Bookmark,
  Sparkles,
  Clock,
  Contrast,
} from "lucide-react";

import { useApp } from "@/lib/cineverse/store";
import type { Dict } from "@/lib/cineverse/i18n";
import type { PageId } from "@/lib/cineverse/types";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CloudSync } from "./CloudSync";
import { MovieModal } from "./MovieModal";
import { WizardModal } from "./Wizard";
import { HomePage } from "./pages/Home";
import { SearchPage } from "./pages/Search";
import { BollywoodPage, FreePage, MoviesPage, TimelinePage, UpcomingPage } from "./pages/Catalog";
import { FavoritesPage, TrackerPage, WatchlistPage } from "./pages/Lists";
import { TVPage } from "./pages/TV";
import { ActorsPage } from "./pages/Actors";
import { CalendarPage } from "./pages/Calendar";
import { StatsPage } from "./pages/Stats";
import { SettingsPage } from "./pages/Settings";

const SIDE_ITEMS: { id: PageId; icon: typeof Home; label: keyof Dict }[] = [
  { id: "home", icon: Home, label: "home" },
  { id: "search", icon: Search, label: "search" },
  { id: "movies", icon: Clapperboard, label: "movies" },
  { id: "bollywood", icon: IndianRupee, label: "bollywood" },
  { id: "free", icon: Sparkles, label: "free" },
  { id: "upcoming", icon: Clock, label: "upcoming" },
  { id: "tv", icon: Tv, label: "liveTv" },
  { id: "actors", icon: UserRound, label: "actors" },
  { id: "watchlist", icon: Bookmark, label: "watchlist" },
  { id: "favorites", icon: Heart, label: "favorites" },
  { id: "tracker", icon: ListChecks, label: "tracker" },
  { id: "calendar", icon: CalendarDays, label: "calendar" },
  { id: "timeline", icon: Star, label: "timeline" },
  { id: "profile", icon: BarChart3, label: "stats" },
  { id: "settings", icon: Settings, label: "settings" },
];

const BOTTOM: PageId[] = ["home", "search", "watchlist", "tv", "tracker", "profile"];

export function AppShell() {
  const {
    ready,
    hydrate,
    page,
    nav,
    dict: t,
    settings,
    setSettings,
    online,
    setOnline,
    toast,
    confirm,
    closeConfirm,
    moreOpen,
    setMore,
    closeMovie,
    setWizard,
    reminders,
    showToast,
    catalog,
    searchHistory,
    openMovie,
    addSearch,
  } = useApp();
  const [query, setQuery] = useState("");
  const [help, setHelp] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const suggestBox = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchHistory.slice(0, 6).map((s) => ({ kind: "hist" as const, label: s }));
    const movies = catalog
      .filter((m) => (m.title || "").toLowerCase().includes(q))
      .slice(0, 6)
      .map((m) => ({ kind: "movie" as const, label: m.title, id: m.id, year: m.year }));
    const hist = searchHistory
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 4)
      .map((s) => ({ kind: "hist" as const, label: s }));
    return [...movies, ...hist].slice(0, 8);
  }, [query, catalog, searchHistory]);


  useEffect(() => {
    hydrate();
    setMounted(true);
  }, [hydrate]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [setOnline]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        nav("search");
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        closeMovie();
        setWizard(false);
        setMore(false);
        setHelp(false);
        if (confirm) closeConfirm(false);
      }
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setHelp((v) => !v);
      }
      if ((e.key === "h" || e.key === "H") && !typing && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        nav("home");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, closeMovie, setWizard, setMore, confirm, closeConfirm]);

  useEffect(() => {
    if (!ready || !("Notification" in window) || Notification.permission !== "granted") return;
    const today = new Date().toISOString().slice(0, 10);
    reminders
      .filter((r) => r.date === today)
      .forEach((r) => {
        try {
          new Notification("CineVerse", { body: r.title });
        } catch {
          /* ignore */
        }
      });
  }, [ready, reminders]);

  const collapsed = settings.sidebarCollapsed;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg">
        {t.skipToContent}
      </a>
      {!online && mounted ? (
        <div className="flex items-center justify-center gap-2 bg-warn/15 py-1.5 text-center text-xs font-medium text-warn" role="status">
          <WifiOff className="size-3.5" /> {t.offline}
        </div>
      ) : null}

      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-bg/85 px-3 backdrop-blur-md md:h-16 md:px-4">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full bg-card md:hidden"
          onClick={() => setMore(true)}
          aria-label={t.more}
        >
          <Menu className="size-5" />
        </button>
        <button type="button" onClick={() => nav("home")} className="shrink-0 text-left">
          <span className="font-display text-lg tracking-tight md:text-xl">
            Cine<span className="text-accent">Verse</span>
          </span>
        </button>
        <div className="relative mx-auto min-w-0 max-w-md flex-1" ref={suggestBox}>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder={t.searchPlaceholder}
            aria-label={t.search}
            aria-autocomplete="list"
            aria-expanded={suggestOpen}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 180)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestOpen(true);
              if (e.target.value && page !== "search") nav("search");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSearch(query);
                nav("search");
                setSuggestOpen(false);
              }
            }}
            className="h-11 w-full rounded-full border border-border bg-card pr-3 pl-10 text-sm outline-none placeholder:text-subtle focus:border-accent"
          />
          {suggestOpen && suggestions.length ? (
            <ul
              role="listbox"
              className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 overflow-hidden rounded-xl border border-border bg-elevated shadow-[var(--shadow-soft)]"
            >
              {suggestions.map((s, i) => (
                <li key={`${s.kind}-${s.label}-${i}`}>
                  <button
                    type="button"
                    className="flex h-11 w-full items-center gap-2 px-3 text-left text-sm hover:bg-card"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (s.kind === "movie" && s.id) {
                        openMovie(s.id);
                        setQuery(s.label);
                      } else {
                        setQuery(s.label);
                        nav("search");
                      }
                      setSuggestOpen(false);
                    }}
                  >
                    {s.kind === "movie" ? (
                      <Clapperboard className="size-3.5 shrink-0 text-subtle" />
                    ) : (
                      <Search className="size-3.5 shrink-0 text-subtle" />
                    )}
                    <span className="truncate">{s.label}</span>
                    {s.kind === "movie" && s.year ? <span className="ml-auto text-xs text-subtle">{s.year}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          className="hidden size-11 place-items-center rounded-full bg-card md:grid"
          onClick={() =>
            setSettings({
              theme: settings.theme === "light" ? "dark" : settings.theme === "dark" ? "oled" : "light",
            })
          }
          aria-label={t.toggleTheme}
        >
          {settings.theme === "light" ? <Sun className="size-5" /> : settings.theme === "oled" ? <Contrast className="size-5" /> : <Moon className="size-5" />}
        </button>
        <AuthSlot />
        <button type="button" className="grid size-11 place-items-center rounded-full bg-card" onClick={() => nav("settings")} aria-label={t.settings}>
          <Settings className="size-5" />
        </button>
      </header>

      <aside
        className={`fixed top-14 bottom-0 left-0 z-30 hidden flex-col border-r border-border bg-surface pt-3 md:top-16 md:flex ${collapsed ? "w-[72px]" : "w-[220px]"}`}
      >
        <button
          type="button"
          className="mx-auto mb-2 grid size-10 place-items-center rounded-full text-muted hover:text-fg"
          onClick={() => setSettings({ sidebarCollapsed: !collapsed })}
          aria-label={collapsed ? t.expand : t.collapse}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
        <nav className="hide-scroll flex-1 overflow-y-auto px-2 pb-4" aria-label="Primary">
          {SIDE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            const label = t[item.label];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => nav(item.id)}
                className={`mb-0.5 flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${active ? "bg-accent/15 text-accent" : "text-muted hover:bg-card hover:text-fg"} ${collapsed ? "justify-center px-0" : ""}`}
                aria-current={active ? "page" : undefined}
                title={label}
              >
                <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                {!collapsed ? <span className="truncate">{label}</span> : null}
              </button>
            );
          })}
        </nav>
      </aside>

      <main
        id="main"
        className={`px-3 pt-4 pb-[calc(72px+env(safe-area-inset-bottom))] md:px-8 md:pt-6 md:pb-10 ${collapsed ? "md:ml-[72px]" : "md:ml-[220px]"}`}
      >
        <div className="mx-auto max-w-[1180px]">
          {page === "home" && <HomePage />}
          {page === "search" && <SearchPage query={query} setQuery={setQuery} />}
          {page === "movies" && <MoviesPage />}
          {page === "bollywood" && <BollywoodPage />}
          {page === "free" && <FreePage />}
          {page === "upcoming" && <UpcomingPage />}
          {page === "tv" && <TVPage />}
          {page === "actors" && <ActorsPage />}
          {page === "watchlist" && <WatchlistPage />}
          {page === "favorites" && <FavoritesPage />}
          {page === "tracker" && <TrackerPage />}
          {page === "calendar" && <CalendarPage />}
          {page === "timeline" && <TimelinePage />}
          {page === "profile" && <StatsPage />}
          {page === "settings" && <SettingsPage />}
        </div>
      </main>

      <nav
        className="fixed right-0 bottom-0 left-0 z-40 flex h-[64px] items-stretch justify-around border-t border-border bg-bg/90 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Mobile"
      >
        {BOTTOM.map((id) => {
          const item = SIDE_ITEMS.find((s) => s.id === id)!;
          const Icon = item.icon;
          const active = page === id;
          const label = t[item.label];
          return (
            <button
              key={id}
              type="button"
              onClick={() => nav(id)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${active ? "text-accent" : "text-subtle"}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 bg-overlay md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-y-0 left-0 w-[80%] max-w-xs overflow-y-auto bg-surface p-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.more}>
            <p className="font-display mb-3 text-xl">CineVerse</p>
            {SIDE_ITEMS.map((item) => {
              const Icon = item.icon;
              const label = t[item.label];
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`mb-1 flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm ${page === item.id ? "bg-accent/15 text-accent" : "text-fg"}`}
                  onClick={() => nav(item.id)}
                >
                  <Icon className="size-5" /> {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <MovieModal />
      <WizardModal />
      <CloudSync />

      {confirm ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-overlay p-5" onClick={() => closeConfirm(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-elevated p-5" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <h3 id="confirm-title" className="mb-1 text-lg font-semibold">{confirm.title}</h3>
            <p className="mb-5 text-sm text-muted">{confirm.msg}</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="h-11 rounded-full px-4 text-sm" onClick={() => closeConfirm(false)}>
                {t.cancel}
              </button>
              <button type="button" className="h-11 rounded-full bg-accent px-4 text-sm text-accent-fg" onClick={() => closeConfirm(true)}>
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="pointer-events-none fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-[70] -translate-x-1/2 rounded-lg border border-border bg-elevated px-4 py-2.5 text-sm shadow-[var(--shadow-soft)] md:bottom-8" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      {help ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-overlay p-5" onClick={() => setHelp(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-elevated p-5 text-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-semibold">{t.shortcuts}</h3>
            <ul className="space-y-1 text-muted">
              <li>/ — {t.focusSearch}</li>
              <li>Esc — {t.closeModal}</li>
              <li>? — {t.shortcuts}</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  const t = useApp((s) => s.dict);
  if (isPending) {
    return <div className="size-9 shrink-0 animate-pulse rounded-full bg-card" aria-hidden />;
  }
  if (user) {
    return (
      <div className="max-w-[140px] min-w-0 md:max-w-[220px]">
        <UserButton />
      </div>
    );
  }
  return (
    <a href="/login" className="inline-flex h-11 shrink-0 items-center rounded-full bg-card px-3 text-sm md:px-4">
      {t.signIn}
    </a>
  );
}
