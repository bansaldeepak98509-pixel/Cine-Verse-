import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, Dices, Heart, Sparkles, Star, Trash2 } from "lucide-react";
import { formatDateIN, genId } from "@/lib/utils";
import { pickFromTracker } from "@/lib/cineverse/recommend";
import { downloadBlob } from "@/lib/cineverse/storage";
import { useApp } from "@/lib/cineverse/store";
import { PRIORITY_ORDER } from "@/lib/cineverse/store";
import { STORAGE_KEYS, type LibEntry, type Priority, type TrackerItem } from "@/lib/cineverse/types";
import { Btn, Chip, EmptyState, PosterImg, ProgressBar, SelectInput, StatCard, TextInput } from "../widgets";

export function WatchlistPage() {
  const { library, setLibrary, upsertLib, dict: t, openMovie, showToast, categories } = useApp();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "watched" | "unwatched">("all");
  const [sort, setSort] = useState("newest");
  const [pri, setPri] = useState<"all" | Priority>("all");
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);

  const list = useMemo(() => {
    let items = library.filter((m) => m.inWatchlist || m.watched || m.favorite);
    if (f === "watched") items = items.filter((m) => m.watched);
    else if (f === "unwatched") items = items.filter((m) => !m.watched && m.inWatchlist);
    if (pri !== "all") items = items.filter((m) => (m.priority || "medium") === pri);
    if (cat !== "all") items = items.filter((m) => m.category === cat);
    if (q) items = items.filter((m) => (m.title || "").toLowerCase().includes(q.toLowerCase()));
    if (sort === "title") items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sort === "rating") items.sort((a, b) => (b.voteAvg || 0) - (a.voteAvg || 0));
    else if (sort === "priority") items.sort((a, b) => PRIORITY_ORDER[a.priority || "medium"] - PRIORITY_ORDER[b.priority || "medium"]);
    else items.sort((a, b) => (a.sortOrder ?? b.addedAt ?? 0) - (b.sortOrder ?? a.addedAt ?? 0) || (b.addedAt || 0) - (a.addedAt || 0));
    return items;
  }, [library, q, f, sort, pri, cat]);

  function toggleSel(id: string) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  }

  function bulkWatched() {
    selected.forEach((id) => upsertLib(id, { watched: true, watchedDate: new Date().toISOString().slice(0, 10) }));
    setSelected(new Set());
    showToast(t.saved);
  }
  function bulkRemove() {
    setLibrary(library.filter((x) => !selected.has(x.id)));
    setSelected(new Set());
    showToast(t.removed);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = list.map((x) => x.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    const next = library.map((item) => {
      const i = ids.indexOf(item.id);
      return i >= 0 ? { ...item, sortOrder: i } : item;
    });
    setLibrary(next);
    setDragId(null);
  }

  return (
    <div className="anim-enter pb-8">
      <h1 className="font-display mb-3 text-3xl">{t.watchlist}</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        <TextInput placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} className="h-9 min-w-[120px] flex-1 rounded-full" />
        <Chip active={f === "all"} onClick={() => setF("all")}>{t.all}</Chip>
        <Chip active={f === "unwatched"} onClick={() => setF("unwatched")}>{t.unwatched}</Chip>
        <Chip active={f === "watched"} onClick={() => setF("watched")}>{t.watched}</Chip>
        <SelectInput value={sort} onChange={(e) => setSort(e.target.value)} className="h-9">
          <option value="newest">{t.recentlyAdded}</option>
          <option value="title">{t.titleAZ}</option>
          <option value="rating">{t.rate}</option>
          <option value="priority">{t.priority}</option>
        </SelectInput>
        <SelectInput value={pri} onChange={(e) => setPri(e.target.value as typeof pri)} className="h-9">
          <option value="all">{t.priority}</option>
          <option value="high">{t.priorityHigh}</option>
          <option value="medium">{t.priorityMed}</option>
          <option value="low">{t.priorityLow}</option>
        </SelectInput>
        <SelectInput value={cat} onChange={(e) => setCat(e.target.value)} className="h-9">
          <option value="all">{t.category}</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelectInput>
      </div>
      {selected.size ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <Btn size="sm" variant="ok" onClick={bulkWatched}>{t.markWatched} ({selected.size})</Btn>
          <Btn size="sm" variant="danger" onClick={bulkRemove}>{t.removeSelected}</Btn>
        </div>
      ) : null}
      {!list.length ? (
        <EmptyState title={t.emptyWatchlist} />
      ) : (
        list.map((m) => (
          <div
            key={m.id}
            draggable
            onDragStart={() => setDragId(m.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(m.id)}
            className="mb-2 flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <input type="checkbox" className="size-4 accent-[var(--cv-accent)]" checked={selected.has(m.id)} onChange={() => toggleSel(m.id)} aria-label={t.select} />
            <div className="h-[72px] w-12 shrink-0 overflow-hidden rounded-sm">
              <PosterImg src={m.poster} alt="" className="h-full w-full" />
            </div>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openMovie(m.id)}>
              <div className="font-medium">{m.title || "Untitled"}</div>
              <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-muted">
                <span>{m.year}</span>
                <span className={m.watched ? "text-ok" : "text-warn"}>{m.watched ? t.watched : t.unwatched}</span>
                {m.favorite ? <Heart className="inline size-3 fill-current text-accent" /> : null}
                <span className="capitalize">{m.priority || "medium"}</span>
                {m.category ? <span>{m.category}</span> : null}
              </div>
            </button>
            <SelectInput
              className="h-9 w-[108px]"
              value={m.priority || "medium"}
              onChange={(e) => upsertLib(m.id, { priority: e.target.value as Priority })}
            >
              <option value="high">{t.priorityHigh}</option>
              <option value="medium">{t.priorityMed}</option>
              <option value="low">{t.priorityLow}</option>
            </SelectInput>
            <Btn
              size="icon"
              variant={m.watched ? "secondary" : "ok"}
              className="size-9"
              onClick={() => upsertLib(m.id, { watched: !m.watched, watchedDate: !m.watched ? new Date().toISOString().slice(0, 10) : null })}
              aria-label={m.watched ? t.unwatched : t.markWatched}
            >
              {m.watched ? <Clock className="size-4" /> : <Check className="size-4" />}
            </Btn>
            <Btn
              size="icon"
              variant="danger"
              className="size-9"
              onClick={() => {
                setLibrary(library.filter((x) => x.id !== m.id));
                showToast(t.removed);
              }}
            >
              <Trash2 className="size-4" />
            </Btn>
          </div>
        ))
      )}
    </div>
  );
}

export function FavoritesPage() {
  const { library, dict: t, openMovie } = useApp();
  const list = library.filter((m) => m.favorite).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  return (
    <div className="anim-enter pb-8">
      <h1 className="font-display mb-4 text-3xl">{t.favorites}</h1>
      {!list.length ? (
        <EmptyState title={t.emptyFavorites} />
      ) : (
        list.map((m) => (
          <button key={m.id} type="button" onClick={() => openMovie(m.id)} className="mb-2 flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left">
            <div className="h-[72px] w-12 shrink-0 overflow-hidden rounded-sm">
              <PosterImg src={m.poster} alt="" className="h-full w-full" />
            </div>
            <Heart className="size-4 fill-current text-accent" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{m.title}</div>
              <div className="text-xs text-muted">{m.year}{m.myRating ? ` · ${m.myRating}/10` : ""}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

export function TrackerPage() {
  const {
    tracker,
    setTracker,
    addTracker,
    updateTracker,
    removeTracker,
    askConfirm,
    dict: t,
    showToast,
  } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "watched" | "unwatched" | "favorite">("all");
  const [sort, setSort] = useState("az");
  const [name, setName] = useState("");
  const [bulk, setBulk] = useState("");
  const jsonRef = useRef<HTMLInputElement>(null);
  const txtRef = useRef<HTMLInputElement>(null);
  const [featuredId, setFeaturedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = [...tracker];
    if (filter === "watched") list = list.filter((m) => m.watched);
    else if (filter === "unwatched") list = list.filter((m) => !m.watched);
    else if (filter === "favorite") list = list.filter((m) => m.favorite);
    if (q) list = list.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
    if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "za") list.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "newest") list.sort((a, b) => b.addedAt - a.addedAt);
    else list.sort((a, b) => a.addedAt - b.addedAt);
    return list;
  }, [tracker, q, filter, sort]);

  const total = tracker.length;
  const watched = tracker.filter((m) => m.watched).length;
  const pct = total ? Math.round((watched / total) * 100) : 0;

  function importJson(text: string) {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("bad");
      let added = 0;
      const next = [...tracker];
      data.forEach((item: Record<string, unknown>) => {
        const cleaned = String(item?.name || item?.title || "").trim();
        if (!cleaned || next.some((m) => m.name.toLowerCase() === cleaned.toLowerCase())) return;
        next.push({
          id: genId(),
          name: cleaned,
          watched: !!item.watched,
          favorite: !!item.favorite,
          addedAt: typeof item.addedAt === "number" ? item.addedAt : Date.now(),
          rating: typeof item.rating === "number" ? item.rating : undefined,
          notes: typeof item.notes === "string" ? item.notes : undefined,
        });
        added++;
      });
      if (added) {
        setTracker(next);
        showToast(`${added} ${t.imported}`);
      } else showToast("No new");
    } catch {
      showToast(t.invalidJson);
    }
  }

  return (
    <div className="anim-enter pb-8">
      <h1 className="font-display text-3xl">{t.tracker}</h1>
      <p className="mt-1 mb-4 text-sm text-muted">{t.offline}</p>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={total} label={t.total} />
        <StatCard value={watched} label={t.watched} color="text-ok" />
        <StatCard value={total - watched} label={t.toWatch} color="text-warn" />
        <StatCard value={`${pct}%`} label={t.progress} color="text-info" />
      </div>
      <ProgressBar value={pct} label={`${watched} / ${total} ${t.ofWatched}`} />

      <TrackerTodayCard onPick={setFeaturedId} />

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm text-muted">{t.addMovie}</h3>
        <div className="mb-3 flex gap-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={t.addMovie} onKeyDown={(e) => { if (e.key === "Enter") { if (addTracker(name)) { setName(""); showToast(t.added); } } }} />
          <Btn variant="primary" onClick={() => { if (addTracker(name)) { setName(""); showToast(t.added); } }}>{t.add}</Btn>
        </div>
        <h3 className="mb-2 text-sm text-muted">{t.bulkAdd}</h3>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} className="mb-2 min-h-[70px] w-full rounded-md border border-border bg-elevated p-3 text-sm" />
        <Btn
          size="sm"
          variant="secondary"
          onClick={() => {
            const lines = bulk.split("\n");
            let added = 0;
            let skipped = 0;
            lines.forEach((line) => {
              const c = line.trim().replace(/\s+/g, " ");
              if (!c) return;
              if (!addTracker(c)) skipped++;
              else added++;
            });
            if (added) {
              showToast(`${added} ${t.added}${skipped ? `, ${skipped} ${t.duplicateSkipped}` : ""}`);
              setBulk("");
            } else showToast(skipped ? t.alreadyInList : t.noneVisible);
          }}
        >
          {t.addAll}
        </Btn>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TextInput placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} className="h-9 min-w-[100px] flex-1 rounded-full" />
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>{t.all}</Chip>
        <Chip active={filter === "unwatched"} onClick={() => setFilter("unwatched")}>{t.unwatched}</Chip>
        <Chip active={filter === "watched"} onClick={() => setFilter("watched")}>{t.watched}</Chip>
        <Chip active={filter === "favorite"} onClick={() => setFilter("favorite")}>{t.favorite}</Chip>
        <SelectInput value={sort} onChange={(e) => setSort(e.target.value)} className="h-9">
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="newest">{t.recentlyAdded}</option>
          <option value="oldest">{t.oldest}</option>
        </SelectInput>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn size="sm" variant="secondary" onClick={() => { const ids = new Set(visible.map((m) => m.id)); setTracker(tracker.map((m) => (ids.has(m.id) ? { ...m, watched: true } : m))); showToast(t.saved); }}>{t.markVisibleWatched}</Btn>
        <Btn size="sm" variant="secondary" onClick={() => { const ids = new Set(visible.map((m) => m.id)); setTracker(tracker.map((m) => (ids.has(m.id) ? { ...m, watched: false } : m))); showToast(t.saved); }}>{t.markVisibleUnwatched}</Btn>
        <Btn size="sm" variant="secondary" onClick={() => { if (!tracker.length) return showToast(t.noneVisible); downloadBlob(JSON.stringify(tracker, null, 2), `movie-tracker-${new Date().toISOString().slice(0, 10)}.json`, "application/json"); showToast(t.exported); }}>{t.exportJson}</Btn>
        <Btn size="sm" variant="secondary" onClick={() => jsonRef.current?.click()}>{t.importJson}</Btn>
        <Btn size="sm" variant="secondary" onClick={() => { if (!tracker.length) return; downloadBlob(tracker.map((m) => `${m.name} ${m.watched ? "[Watched]" : "[To Watch]"}${m.favorite ? " ★" : ""}`).join("\n"), `movie-list-${new Date().toISOString().slice(0, 10)}.txt`, "text/plain"); showToast(t.exported); }}>{t.exportTxt}</Btn>
        <Btn size="sm" variant="secondary" onClick={() => txtRef.current?.click()}>{t.importTxt}</Btn>
        <Btn size="sm" variant="secondary" onClick={() => { if (!tracker.length) return; const header = "name,watched,favorite,rating,addedAt\n"; const rows = tracker.map((m) => `"${m.name.replace(/"/g, '""')}",${m.watched},${m.favorite},${m.rating ?? ""},${m.addedAt}`).join("\n"); downloadBlob(header + rows, `movie-tracker-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv"); showToast(t.exported); }}>{t.exportCsv}</Btn>
        <Btn
          size="sm"
          variant="danger"
          onClick={async () => {
            if (!tracker.length) return;
            const ok = await askConfirm(t.clearAll, t.confirmClear);
            if (!ok) return;
            setTracker([]);
            showToast(t.removed);
          }}
        >
          {t.clearAll}
        </Btn>
      </div>
      <input ref={jsonRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; f.text().then(importJson); e.target.value = ""; }} />
      <input ref={txtRef} type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; f.text().then((text) => { let added = 0; text.split("\n").forEach((line) => { const cleaned = line.replace(/\[(Watched|To Watch)\]/gi, "").replace(/★/g, "").trim().replace(/\s+/g, " "); if (cleaned && addTracker(cleaned)) added++; }); showToast(added ? `${added} ${t.imported}` : "No new"); }); e.target.value = ""; }} />

      <div className="mt-4">
        {!tracker.length ? (
          <EmptyState title={t.emptyTracker} />
        ) : !visible.length ? (
          <EmptyState title={t.noMatch} />
        ) : (
          visible.map((m) => <TrackerRow key={m.id} item={m} featured={m.id === featuredId} />)
        )}
      </div>
    </div>
  );
}

function TrackerTodayCard({ onPick }: { onPick: (id: string | null) => void }) {
  const { tracker, updateTracker, catalog, openMovie, dict: t, showToast } = useApp();
  const [pickId, setPickId] = useState<string | null>(null);

  useEffect(() => {
    const saved = readTodayPick();
    const stillThere = saved && tracker.some((x) => x.id === saved);
    const next = stillThere ? saved : pickFromTracker(tracker)?.id ?? null;
    setPickId(next);
    onPick(next);
    if (next) writeTodayPick(next);
    else clearTodayPick();
  }, [tracker, onPick]);

  const pick = tracker.find((x) => x.id === pickId) ?? null;
  const unwatchedLeft = tracker.some((x) => !x.watched);
  const catalogHit = pick
    ? catalog.find((m) => (m.title || "").toLowerCase() === pick.name.toLowerCase() || (pick.tmdbId && m.tmdbId === pick.tmdbId))
    : undefined;

  function shuffle() {
    const next = pickFromTracker(tracker, pickId || undefined);
    if (!next) {
      showToast(t.noTrackerPick);
      return;
    }
    setPickId(next.id);
    onPick(next.id);
    writeTodayPick(next.id);
    showToast(next.name);
  }

  function watchThis() {
    if (!pick) return;
    updateTracker(pick.id, { watched: true, watchedDate: new Date().toISOString().slice(0, 10) });
    showToast(t.saved);
  }

  return (
    <section className="mt-4 rounded-xl border border-accent/40 bg-card p-4" aria-live="polite">
      <p className="flex items-center gap-2 text-xs tracking-wide text-muted uppercase">
        <Sparkles className="size-3.5 text-accent" /> {t.watchToday}
      </p>
      {pick ? (
        <>
          <h2 className="font-display mt-2 text-2xl">{pick.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {pick.watched ? t.watched : t.unwatched}
            {pick.favorite ? ` · ${t.favorite}` : ""}
            {pick.rating ? ` · ${pick.rating}/10` : ""}
          </p>
          <p className="mt-1 text-xs text-subtle">{unwatchedLeft ? t.watchTodayHint : t.allWatchedRewatch}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="primary" onClick={shuffle} aria-label={t.shufflePick}>
              <Dices className="size-4" /> {t.shufflePick}
            </Btn>
            {!pick.watched ? (
              <Btn variant="ok" onClick={watchThis}>
                <Check className="size-4" /> {t.pickThis}
              </Btn>
            ) : null}
            {catalogHit ? (
              <Btn variant="secondary" onClick={() => openMovie(catalogHit.id)}>
                {t.details}
              </Btn>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{t.noTrackerPick}</p>
          <Btn className="mt-3" variant="secondary" disabled>
            <Dices className="size-4" /> {t.shufflePick}
          </Btn>
        </>
      )}
    </section>
  );
}

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readTodayPick(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.trackerToday);
    if (!raw) return null;
    const data = JSON.parse(raw) as { id?: string; date?: string };
    if (data.date !== todayStamp() || !data.id) return null;
    return data.id;
  } catch {
    return null;
  }
}

function writeTodayPick(id: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.trackerToday, JSON.stringify({ id, date: todayStamp() }));
  } catch {
    /* private mode */
  }
}

function clearTodayPick() {
  try {
    localStorage.removeItem(STORAGE_KEYS.trackerToday);
  } catch {
    /* ignore */
  }
}

function TrackerRow({ item, featured }: { item: TrackerItem; featured?: boolean }) {
  const { updateTracker, removeTracker, askConfirm, dict: t, showToast } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className={`mb-2 rounded-lg border bg-card ${featured ? "border-accent" : "border-border"}`} style={{ borderLeft: `3px solid ${item.watched ? "var(--cv-ok)" : "var(--cv-warn)"}` }}>
      <div className="flex items-center gap-2 p-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen((v) => !v)}>
          <div className="font-medium">{item.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className={item.watched ? "text-ok" : "text-warn"}>{item.watched ? t.watched : t.unwatched}</span>
            {item.favorite ? <Heart className="inline size-3 fill-current text-accent" /> : null}
            {item.rating ? <span>{item.rating}/10</span> : null}
            <span>{formatDateIN(item.addedAt)}</span>
          </div>
        </button>
        <Btn size="icon" className="size-9" variant="ghost" onClick={() => updateTracker(item.id, { favorite: !item.favorite })} aria-label={t.favorite}>
          <Star className={`size-4 ${item.favorite ? "fill-current text-warn" : ""}`} />
        </Btn>
        <Btn size="icon" className="size-9" variant={item.watched ? "secondary" : "ok"} onClick={() => { updateTracker(item.id, { watched: !item.watched, watchedDate: !item.watched ? new Date().toISOString().slice(0, 10) : undefined }); }} aria-label={item.watched ? t.unwatched : t.markWatched}>
          {item.watched ? <Clock className="size-4" /> : <Check className="size-4" />}
        </Btn>
        <Btn
          size="icon"
          className="size-9"
          variant="danger"
          onClick={async () => {
            const ok = await askConfirm(t.delete, t.confirmDelete);
            if (!ok) return;
            removeTracker(item.id);
            showToast(t.removed);
          }}
        >
          <Trash2 className="size-4" />
        </Btn>
      </div>
      {open ? (
        <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            {t.rate} 1–10
            <input type="number" min={1} max={10} value={item.rating || ""} onChange={(e) => updateTracker(item.id, { rating: Number(e.target.value) || undefined })} className="mt-1 h-10 w-full rounded-md border border-border bg-elevated px-2" />
          </label>
          <label className="text-xs text-muted">
            {t.watchDate}
            <input type="date" value={item.watchedDate || ""} onChange={(e) => updateTracker(item.id, { watchedDate: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-elevated px-2" />
          </label>
          <label className="text-xs text-muted">
            {t.rewatch}
            <input type="number" min={0} value={item.rewatchCount || 0} onChange={(e) => updateTracker(item.id, { rewatchCount: Number(e.target.value) || 0 })} className="mt-1 h-10 w-full rounded-md border border-border bg-elevated px-2" />
          </label>
          <label className="text-xs text-muted sm:col-span-2">
            {t.notes}
            <textarea value={item.notes || ""} onChange={(e) => updateTracker(item.id, { notes: e.target.value })} className="mt-1 min-h-[56px] w-full rounded-md border border-border bg-elevated p-2" />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export type { LibEntry };
