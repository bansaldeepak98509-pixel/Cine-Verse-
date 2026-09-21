import { useMemo, useState } from "react";
import { Dices, Sparkles, Star, Timer, WifiOff, X } from "lucide-react";
import { filterWizard, underTwoHours } from "@/lib/cineverse/recommend";
import { MOODS } from "@/lib/cineverse/demo";
import { useApp } from "@/lib/cineverse/store";
import { Btn, Chip, EmptyState, MovieCard, SelectInput } from "./widgets";

export function WizardModal() {
  const { wizardOpen, setWizard, catalog, library, tracker, dict: t, openMovie } = useApp();
  const [mood, setMood] = useState("");
  const [genre, setGenre] = useState("all");
  const [language, setLanguage] = useState("all");
  const [runtimeMax, setRuntimeMax] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [platform, setPlatform] = useState("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [unwatchedOnly, setUnwatchedOnly] = useState(true);

  const watched = useMemo(() => {
    const s = new Set<string>();
    library.filter((m) => m.watched).forEach((m) => s.add((m.title || "").toLowerCase()));
    tracker.filter((m) => m.watched).forEach((m) => s.add(m.name.toLowerCase()));
    return s;
  }, [library, tracker]);

  const results = useMemo(
    () =>
      filterWizard(catalog, {
        mood: mood || undefined,
        genre,
        language,
        runtimeMax: runtimeMax || undefined,
        minRating: minRating || undefined,
        platform,
        freeOnly,
        unwatchedOnly,
        watchedTitles: watched,
      }).slice(0, 16),
    [catalog, mood, genre, language, runtimeMax, minRating, platform, freeOnly, unwatchedOnly, watched],
  );

  if (!wizardOpen) return null;

  function pick(list: typeof catalog) {
    if (!list.length) return;
    const m = list[Math.floor(Math.random() * list.length)];
    setWizard(false);
    openMovie(m.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay md:items-center" onClick={(e) => e.target === e.currentTarget && setWizard(false)} role="dialog" aria-modal="true">
      <div className="anim-enter max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-5 md:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-2xl">{t.wizardTitle}</h3>
          <button type="button" className="grid size-10 place-items-center rounded-full bg-card" onClick={() => setWizard(false)} aria-label={t.close}>
            <X className="size-4" />
          </button>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Btn size="sm" variant="primary" onClick={() => pick(catalog)}>
            <Dices className="size-4" /> {t.surpriseMe}
          </Btn>
          <Btn
            size="sm"
            variant="secondary"
            onClick={() => {
              const list = results.length ? results.map((r) => r.movie) : catalog.filter((m) => (m.runtime || 150) <= 140);
              pick(list);
            }}
          >
            <Sparkles className="size-4" /> {t.pickTonight}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => pick(underTwoHours(catalog))}>
            <Timer className="size-4" /> {t.underTwoHours}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => pick(catalog.filter((m) => (m.rating || 0) >= 8))}>
            <Star className="size-4" /> {t.highlyRated}
          </Btn>
          <Btn size="sm" variant="ghost" className="col-span-2" onClick={() => pick(catalog.filter((m) => m.isFree))}>
            <WifiOff className="size-4" /> {t.freeTonight}
          </Btn>
        </div>
        <p className="mb-2 text-sm text-muted">{t.mood}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip key={m} active={mood === m} onClick={() => setMood(mood === m ? "" : m)}>
              {m}
            </Chip>
          ))}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <SelectInput value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="all">{t.genre}</option>
            {MOODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </SelectInput>
          <SelectInput value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="all">{t.allLanguages}</option>
            <option value="Hindi">{t.hindi}</option>
            <option value="English">{t.english}</option>
          </SelectInput>
          <SelectInput value={String(runtimeMax)} onChange={(e) => setRuntimeMax(Number(e.target.value))}>
            <option value="0">{t.runtime}</option>
            <option value="90">≤ 90m</option>
            <option value="120">≤ 2h</option>
            <option value="150">≤ 2.5h</option>
          </SelectInput>
          <SelectInput value={String(minRating)} onChange={(e) => setMinRating(Number(e.target.value))}>
            <option value="0">{t.minRating}</option>
            <option value="6">6+</option>
            <option value="7">7+</option>
            <option value="8">8+</option>
          </SelectInput>
          <SelectInput value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="all">{t.platform}</option>
            {["Netflix", "Prime Video", "JioHotstar", "ZEE5", "SonyLIV", "YouTube"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </SelectInput>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} /> {t.freeOnly}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={unwatchedOnly} onChange={(e) => setUnwatchedOnly(e.target.checked)} /> {t.unwatched}
          </label>
        </div>
        <h4 className="mb-2 text-sm font-medium">
          {t.results} ({results.length})
        </h4>
        {results.length ? (
          <div className="hide-scroll flex gap-3 overflow-x-auto pb-2">
            {results.map((r) => (
              <div key={r.movie.id}>
                <MovieCard movie={r.movie} onOpen={(id) => { setWizard(false); openMovie(id); }} compact />
                <p className="mt-1 w-[124px] text-[10px] text-subtle">{r.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={t.noMatch} />
        )}
      </div>
    </div>
  );
}
