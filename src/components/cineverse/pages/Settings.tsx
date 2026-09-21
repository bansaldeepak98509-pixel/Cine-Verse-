import { useEffect, useRef, useState } from "react";
import { Cloud, Download } from "lucide-react";
import { clearTmdbCache } from "@/lib/cineverse/tmdb";
import {
  buildBackup,
  downloadBlob,
  parseBackup,
  resetKeys,
  saveLibrary,
  saveSearchHistory,
  saveTracker,
} from "@/lib/cineverse/storage";
import { DEMO_TV } from "@/lib/cineverse/demo";
import { useApp } from "@/lib/cineverse/store";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveToCloud, syncFromCloud } from "@/lib/cineverse/sync-cloud";
import { ACCENT_HEX, STORAGE_KEYS, type AccentId, type PageId, type ThemePref } from "@/lib/cineverse/types";
import { Btn, Chip, Field, TextInput } from "../widgets";

export function SettingsPage() {
  const app = useApp();
  const { settings, setSettings, dict: t, syncCatalog, showToast, askConfirm, setManualTv, manualTv } = app;
  const [key, setKey] = useState(settings.apiKey);
  const [tvUrl, setTvUrl] = useState(settings.tvUrl);
  const [json, setJson] = useState(manualTv ? JSON.stringify(manualTv, null, 2) : "");
  const [tvStatus, setTvStatus] = useState("");
  const restoreRef = useRef<HTMLInputElement>(null);

  const themes: { id: ThemePref; label: string }[] = [
    { id: "dark", label: t.darkMode },
    { id: "light", label: t.lightMode },
    { id: "oled", label: t.oledMode },
  ];
  const accents = Object.keys(ACCENT_HEX) as AccentId[];
  const pages: PageId[] = ["home", "movies", "watchlist", "tracker", "profile"];

  function saveTv() {
    try {
      const arr = JSON.parse(json.trim() || "[]");
      if (!Array.isArray(arr)) throw new Error("Need array");
      const mapped = arr
        .map((x: Record<string, string>) => ({
          channel: x.channel || "Channel",
          movieTitle: x.movieTitle || x.title || x.name || "Program",
          start: x.start || x.airtime || "00:00",
          end: x.end || "",
          url: x.url || "",
          scheduleUrl: x.scheduleUrl || "",
        }))
        .filter((x: { start: string }) => x.start);
      setManualTv(mapped);
      setTvStatus(`${mapped.length} saved`);
      showToast(t.saved);
    } catch (e) {
      showToast(t.invalidJson);
      setTvStatus(e instanceof Error ? e.message : t.invalidJson);
    }
  }

  return (
    <div className="anim-enter max-w-xl space-y-8 pb-10">
      <h1 className="font-display text-3xl">{t.settings}</h1>

      <section>
        <h4 className="mb-3 text-sm tracking-wide text-muted uppercase">{t.appearance}</h4>
        <div className="flex flex-wrap gap-2">
          {themes.map((th) => (
            <Chip key={th.id} active={settings.theme === th.id} onClick={() => setSettings({ theme: th.id })}>
              {th.label}
            </Chip>
          ))}
        </div>
        <p className="mt-4 mb-2 text-sm text-muted">{t.accentColor}</p>
        <div className="flex flex-wrap gap-2">
          {accents.map((a) => (
            <button
              key={a}
              type="button"
              aria-label={a}
              onClick={() => setSettings({ accent: a })}
              className="size-9 rounded-full ring-2 ring-offset-2 ring-offset-bg"
              style={{
                background: ACCENT_HEX[a],
                boxShadow: settings.accent === a ? `0 0 0 2px ${ACCENT_HEX[a]}` : undefined,
              }}
            />
          ))}
        </div>
        <p className="mt-4 mb-2 text-sm text-muted">{t.uiLanguage}</p>
        <div className="flex gap-2">
          <Chip active={settings.lang === "en"} onClick={() => setSettings({ lang: "en" })}>
            English
          </Chip>
          <Chip active={settings.lang === "hi"} onClick={() => setSettings({ lang: "hi" })}>
            हिन्दी
          </Chip>
        </div>
      </section>

      <section>
        <Field label={t.defaultLanding}>
          <select
            value={settings.landingPage}
            onChange={(e) => setSettings({ landingPage: e.target.value as PageId })}
            className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
          >
            {pages.map((p) => (
              <option key={p} value={p}>
                {p === "home" ? t.home : p === "movies" ? t.movies : p === "watchlist" ? t.watchlist : p === "tracker" ? t.tracker : t.stats}
              </option>
            ))}
          </select>
        </Field>
        <div className="mt-3">
          <Field label={t.sort}>
            <select
              value={settings.defaultSort}
              onChange={(e) => setSettings({ defaultSort: e.target.value })}
              className="h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm"
            >
              <option value="popularity">{t.popularity}</option>
              <option value="newest">{t.newest}</option>
              <option value="rating-high">{t.ratingHigh}</option>
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-sm tracking-wide text-muted uppercase">{t.preferredGenres}</h4>
        <div className="flex flex-wrap gap-2">
          {["Action", "Comedy", "Drama", "Romance", "Thriller", "War", "Family", "Crime"].map((g) => (
            <Chip
              key={g}
              active={settings.preferredGenres.includes(g)}
              onClick={() => {
                const next = settings.preferredGenres.includes(g)
                  ? settings.preferredGenres.filter((x) => x !== g)
                  : [...settings.preferredGenres, g];
                setSettings({ preferredGenres: next });
              }}
            >
              {g}
            </Chip>
          ))}
        </div>
        <p className="mt-4 mb-2 text-sm text-muted">{t.preferredLang}</p>
        <div className="flex flex-wrap gap-2">
          {["Hindi", "English"].map((l) => (
            <Chip key={l} active={settings.preferredLanguage === l} onClick={() => setSettings({ preferredLanguage: l })}>
              {l}
            </Chip>
          ))}
        </div>
        <p className="mt-4 mb-2 text-sm text-muted">{t.preferredOtt}</p>
        <div className="flex flex-wrap gap-2">
          {["Netflix", "Prime Video", "JioHotstar", "ZEE5", "SonyLIV", "YouTube"].map((p) => (
            <Chip
              key={p}
              active={settings.preferredPlatforms.includes(p)}
              onClick={() => {
                const next = settings.preferredPlatforms.includes(p)
                  ? settings.preferredPlatforms.filter((x) => x !== p)
                  : [...settings.preferredPlatforms, p];
                setSettings({ preferredPlatforms: next });
              }}
            >
              {p}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-sm tracking-wide text-muted uppercase">{t.tmdbApi}</h4>
        <p className="mb-2 text-xs text-muted">
          {t.tmdbHint}{" "}
          <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-info">
            themoviedb.org
          </a>
        </p>
        <TextInput value={key} onChange={(e) => setKey(e.target.value)} placeholder="TMDB API key" autoComplete="off" />
        <div className="mt-2 flex flex-wrap gap-2">
          <Btn
            size="sm"
            variant="primary"
            onClick={() => {
              setSettings({ apiKey: key.trim(), tvUrl: tvUrl.trim() });
              showToast(key.trim() ? t.saved : t.demoMode);
              syncCatalog();
            }}
          >
            {t.saveSync}
          </Btn>
          <Btn
            size="sm"
            variant="secondary"
            onClick={() => {
              setSettings({ apiKey: key.trim(), tvUrl: tvUrl.trim() });
              showToast(t.saved);
            }}
          >
            {t.saveOnly}
          </Btn>
        </div>
        <p className="mt-2 text-xs text-muted">{settings.apiKey ? t.synced : t.demoMode}</p>
      </section>

      <section>
        <h4 className="mb-2 text-sm tracking-wide text-muted uppercase">{t.liveTvSchedule}</h4>
        <TextInput value={tvUrl} onChange={(e) => setTvUrl(e.target.value)} placeholder={t.customTvUrl} className="mb-2" />
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={5}
          placeholder='[{"channel":"Sony Max","movieTitle":"3 Idiots","start":"14:00","end":"17:00"}]'
          className="mb-2 w-full rounded-md border border-border bg-elevated p-3 font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" variant="primary" onClick={saveTv}>{t.saveSchedule}</Btn>
          <Btn
            size="sm"
            variant="outline"
            onClick={() => {
              const h = new Date().getHours();
              const pad = (n: number) => String(n).padStart(2, "0");
              const sample = [
                { channel: "Sony Max", movieTitle: "3 Idiots", start: `${pad(Math.max(0, h - 1))}:00`, end: `${pad(Math.min(23, h + 2))}:00`, url: "https://www.sonyliv.com" },
                { channel: "Zee Cinema", movieTitle: "Pathaan", start: `${pad(Math.min(23, h + 1))}:00`, end: `${pad(Math.min(23, h + 4))}:00`, url: "https://www.zee5.com" },
                { channel: "Star Gold", movieTitle: "Jawan", start: `${pad(Math.min(23, h + 2))}:00`, end: `${pad(Math.min(23, h + 5))}:00`, url: "https://www.hotstar.com" },
              ];
              setJson(JSON.stringify(sample, null, 2));
              showToast(t.sample);
            }}
          >
            {t.sample}
          </Btn>
          <Btn
            size="sm"
            variant="danger"
            onClick={() => {
              setManualTv(null);
              setJson("");
              setTvStatus("Cleared");
              showToast(t.removed);
            }}
          >
            {t.clear}
          </Btn>
        </div>
        {tvStatus ? <p className="mt-2 text-xs text-muted">{tvStatus}</p> : null}
        <p className="mt-2 text-[11px] text-subtle">Guide links remain: {DEMO_TV.map((d) => d.channel).join(", ")}</p>
      </section>

      <section>
        <h4 className="mb-3 text-sm tracking-wide text-muted uppercase">{t.data}</h4>
        <Row label={t.clearHistory} action={<Btn size="sm" variant="ghost" onClick={() => { saveSearchHistory([]); useApp.setState({ searchHistory: [] }); showToast(t.removed); }}>{t.clear}</Btn>} />
        <Row
          label={t.exportAll}
          action={
            <Btn
              size="sm"
              variant="secondary"
              onClick={() => {
                const data = buildBackup({
                  library: app.library,
                  tracker: app.tracker,
                  searchHistory: app.searchHistory,
                  recentViewed: app.recentViewed,
                  settings: app.settings,
                  reminders: app.reminders,
                  categories: app.categories,
                });
                downloadBlob(JSON.stringify(data, null, 2), `cineverse-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
                showToast(t.exported);
              }}
            >
              {t.exportAll}
            </Btn>
          }
        />
        <Row
          label={t.restoreBackup}
          action={
            <>
              <Btn size="sm" variant="secondary" onClick={() => restoreRef.current?.click()}>{t.restoreBackup}</Btn>
              <input
                ref={restoreRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const parsed = parseBackup(JSON.parse(await f.text()));
                    if (!parsed) throw new Error("bad");
                    const ok = await askConfirm(t.restoreBackup, t.confirmReset);
                    if (!ok) return;
                    saveLibrary(parsed.library);
                    saveTracker(parsed.tracker);
                    useApp.setState({
                      library: parsed.library,
                      tracker: parsed.tracker,
                      searchHistory: parsed.searchHistory,
                      recentViewed: parsed.recentViewed,
                      reminders: parsed.reminders || [],
                      categories: parsed.categories?.length ? parsed.categories : useApp.getState().categories,
                    });
                    if (parsed.settings) {
                      useApp.getState().setSettings(parsed.settings);
                    }
                    showToast(t.restoreOk);
                  } catch {
                    showToast(t.invalidJson);
                  }
                  e.target.value = "";
                }}
              />
            </>
          }
        />
        <Row
          label={t.clearCache}
          action={
            <Btn size="sm" variant="ghost" onClick={() => { clearTmdbCache(); showToast(t.cacheCleared); }}>
              {t.clearCache}
            </Btn>
          }
        />
        <Row
          label={t.fullReset}
          action={
            <Btn
              size="sm"
              variant="danger"
              onClick={async () => {
                const ok = await askConfirm(t.fullReset, t.confirmFullReset);
                if (!ok) return;
                resetKeys(Object.values(STORAGE_KEYS));
                window.location.reload();
              }}
            >
              {t.fullReset}
            </Btn>
          }
        />
      </section>

      <section>
        <h4 className="mb-2 text-sm tracking-wide text-muted uppercase">{t.cloudBackup}</h4>
        <CloudSettings />
      </section>

      <section>
        <h4 className="mb-2 text-sm tracking-wide text-muted uppercase">{t.installApp}</h4>
        <InstallBlock />
      </section>

      <section>
        <h4 className="mb-2 text-sm tracking-wide text-muted uppercase">{t.about}</h4>
        <p className="text-sm text-muted">{t.aboutBody}</p>
        <p className="mt-2 text-xs text-subtle">{t.installHint}</p>
        <p className="mt-2 text-xs text-subtle">{t.version} · {t.shortcutsHint}</p>
      </section>
    </div>
  );
}

function CloudSettings() {
  const { dict: t, showToast } = useApp();
  const { user, isPending } = useCurrentUserState();
  const [busy, setBusy] = useState(false);
  if (isPending) return <div className="skel h-24 rounded-xl" />;
  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm text-muted">{t.cloudHint}</p>
        <a href="/login" className="inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-fg">
          {t.signInToCloud}
        </a>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.displayName || user.primaryEmail || t.signIn}</p>
          <p className="text-xs text-muted">{t.cloudHint}</p>
        </div>
        <UserButton />
      </div>
      <Btn
        size="sm"
        variant="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const ok = await saveToCloud();
          setBusy(false);
          showToast(ok ? t.cloudUploaded : t.apiError);
        }}
      >
        <Cloud className="size-4" /> {busy ? t.cloudSaving : t.saveToCloud}
      </Btn>
      <Btn
        size="sm"
        variant="secondary"
        className="ml-2"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await syncFromCloud();
          setBusy(false);
          showToast(result === "error" ? t.apiError : t.cloudSynced);
        }}
      >
        {t.restoreCloud}
      </Btn>
    </div>
  );
}

function Row({ label, action }: { label: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3">
      <span className="text-sm">{label}</span>
      {action}
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function InstallBlock() {
  const { dict: t, showToast } = useApp();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || !!nav.standalone;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(nav.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {installed ? (
        <p className="text-sm text-ok">{t.installed}</p>
      ) : (
        <>
          {promptEvent ? (
            <Btn
              variant="primary"
              className="mb-3"
              onClick={async () => {
                await promptEvent.prompt();
                const choice = await promptEvent.userChoice;
                if (choice.outcome === "accepted") {
                  setInstalled(true);
                  showToast(t.installed);
                }
                setPromptEvent(null);
              }}
            >
              <Download className="size-4" /> {t.installNow}
            </Btn>
          ) : null}
          <ul className="space-y-2 text-sm text-muted">
            <li>{ios ? t.installIos : t.installAndroid}</li>
            <li>{t.installDesktop}</li>
            <li>{t.installPreview}</li>
          </ul>
        </>
      )}
    </div>
  );
}
