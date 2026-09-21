import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  Clapperboard,
  ExternalLink,
  Heart,
  ListPlus,
  Star,
  X,
} from "lucide-react";
import { formatRuntime, safeHttpUrl, yearOf } from "@/lib/utils";
import { fetchRecs, fetchSimilar } from "@/lib/cineverse/tmdb";
import { useApp } from "@/lib/cineverse/store";
import type { Movie } from "@/lib/cineverse/types";
import { Btn, Carousel, PosterImg, statusClass, statusLabel } from "./widgets";

export function MovieModal() {
  const {
    modalMovieId,
    closeMovie,
    findMovie,
    getLib,
    upsertLib,
    addTracker,
    addRecent,
    ensureEnriched,
    settings,
    dict: t,
    showToast,
    nav,
    setPerson,
    library,
    catalog,
  } = useApp();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [recs, setRecs] = useState<Movie[]>([]);
  const [rateOpen, setRateOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!modalMovieId) {
      setMovie(null);
      setSimilar([]);
      setRecs([]);
      setOverviewOpen(false);
      setRateOpen(false);
      return;
    }
    const found = findMovie(modalMovieId);
    if (!found) {
      showToast(t.noResults);
      closeMovie();
      return;
    }
    setMovie(found);
    setLoading(true);
    addRecent(found);
    let cancelled = false;
    (async () => {
      const enriched = await ensureEnriched(found);
      if (cancelled) return;
      setMovie(enriched);
      addRecent(enriched);
      const localSimilar = catalog
        .filter(
          (x) =>
            x.id !== enriched.id &&
            (x.genres || []).some((g) => (enriched.genres || []).includes(g)),
        )
        .slice(0, 12);
      if (settings.apiKey && enriched.tmdbId) {
        try {
          const [s, r] = await Promise.all([
            fetchSimilar(settings.apiKey, enriched.tmdbId, enriched.mediaType),
            fetchRecs(settings.apiKey, enriched.tmdbId, enriched.mediaType),
          ]);
          if (!cancelled) {
            setSimilar(s.length ? s : localSimilar);
            setRecs(r);
          }
        } catch {
          if (!cancelled) setSimilar(localSimilar);
        }
      } else if (!cancelled) {
        setSimilar(localSimilar);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalMovieId]);

  useEffect(() => {
    if (!modalMovieId) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const getItems = () =>
      [...(panel?.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])") || [])].filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
    const first = getItems()[0];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMovie();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getItems();
      if (!items.length) return;
      const start = items[0];
      const end = items[items.length - 1];
      if (e.shiftKey && document.activeElement === start) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        start.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lastFocus.current?.focus();
    };
  }, [modalMovieId, closeMovie]);

  if (!modalMovieId) return null;
  const m = movie;
  if (!m) return null;
  const lib = getLib(m.id) || getLib(String(m.tmdbId || ""));
  const inWl = !!lib?.inWatchlist;
  const watched = !!lib?.watched;
  const fav = !!lib?.favorite;
  const bg = m.backdrop || m.poster || "";

  const patch = (data: Parameters<typeof upsertLib>[1]) =>
    upsertLib(m.id, {
      title: m.title,
      poster: m.poster,
      year: m.year,
      voteAvg: m.rating,
      tmdbId: m.tmdbId,
      runtime: m.runtime,
      genres: m.genres,
      director: m.director,
      ...data,
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay md:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeMovie();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-title"
    >
      <div
        ref={panelRef}
        className="anim-enter flex max-h-[92dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-soft)] md:max-h-[86vh] md:rounded-2xl"
      >
        <div className="relative h-44 shrink-0 md:h-56">
          {bg ? (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} />
          ) : (
            <div className="absolute inset-0 bg-elevated" />
          )}
          <div className="hero-wash absolute inset-0" />
          <button
            type="button"
            onClick={closeMovie}
            className="absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full bg-elevated text-fg"
            aria-label={t.close}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="hide-scroll flex-1 overflow-y-auto px-4 pt-2 pb-8 md:px-6">
          <div className="flex gap-4">
            <div className="-mt-16 w-24 shrink-0 overflow-hidden rounded-md ring-1 ring-border md:w-28">
              <div className="aspect-[2/3]">
                <PosterImg src={m.poster} alt="" />
              </div>
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h2 id="movie-title" className="font-display text-2xl leading-tight text-fg md:text-3xl">
                {m.title}
              </h2>
              {m.originalTitle && m.originalTitle !== m.title ? (
                <p className="text-sm text-muted">{m.originalTitle}</p>
              ) : null}
              <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-muted">
                <span>{m.year || yearOf(m.releaseDate)}</span>
                {m.runtime ? <span>· {formatRuntime(m.runtime)}</span> : null}
                {m.rating ? (
                  <span className="inline-flex items-center gap-1">
                    · <Star className="size-3.5" /> {m.rating}
                    {m.voteCount ? <span className="text-subtle">({m.voteCount})</span> : null}
                  </span>
                ) : null}
                {m.language ? <span>· {m.language}</span> : null}
              </p>
              {(m.genres || []).length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.genres.map((g) => (
                    <span key={g} className="rounded-full bg-card px-2 py-0.5 text-[11px] text-muted">
                      {g}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Btn
              variant={inWl ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                patch({ inWatchlist: !inWl });
                showToast(!inWl ? t.added : t.removed);
              }}
            >
              <Bookmark className="size-4" /> {inWl ? t.inWatchlist : t.addWatchlist}
            </Btn>
            <Btn
              variant={watched ? "ok" : "ghost"}
              size="sm"
              onClick={() => {
                patch({
                  watched: !watched,
                  watchedDate: !watched ? new Date().toISOString().slice(0, 10) : null,
                  inWatchlist: lib ? lib.inWatchlist : true,
                });
                showToast(!watched ? t.watched : t.unwatched);
              }}
            >
              <Check className="size-4" /> {watched ? t.watched : t.markWatched}
            </Btn>
            <Btn
              variant={fav ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                patch({ favorite: !fav });
                showToast(!fav ? t.favorited : t.removed);
              }}
            >
              <Heart className={`size-4 ${fav ? "fill-current text-accent" : ""}`} /> {fav ? t.favorited : t.favorite}
            </Btn>
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => setRateOpen(true)}
            >
              <Star className="size-4" /> {t.rate}
            </Btn>
            {m.platforms.find((p) => p.url) ? (
              <a
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-accent px-3 text-sm font-medium text-accent-fg"
                href={safeHttpUrl(m.platforms.find((p) => p.url)?.url || "") || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.watchNow}
              </a>
            ) : (
              <a
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-accent px-3 text-sm font-medium text-accent-fg"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${m.title} official trailer`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.watchNow}
              </a>
            )}
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => {
                const ok = addTracker(m.title, { tmdbId: m.tmdbId, poster: m.poster, runtime: m.runtime, genres: m.genres });
                if (ok) showToast(t.added);
              }}
            >
              <ListPlus className="size-4" /> {t.trackerAdd}
            </Btn>
          </div>

          {loading ? <div className="skel mt-4 h-16 w-full" /> : null}

          {m.tagline ? <p className="mt-4 text-sm text-muted italic">“{m.tagline}”</p> : null}

          {m.description ? (
            <div className="mt-4">
              <h3 className="mb-1 text-sm font-semibold">{t.story}</h3>
              <p className={overviewOpen ? "text-sm text-muted" : "line-clamp-4 text-sm text-muted"}>{m.description}</p>
              {m.description.length > 180 ? (
                <button type="button" className="mt-1 text-sm font-medium text-accent" onClick={() => setOverviewOpen((v) => !v)}>
                  {overviewOpen ? t.readLess : t.readMore}
                </button>
              ) : null}
            </div>
          ) : null}

          {m.director || (m.writers && m.writers.length) ? (
            <div className="mt-4 space-y-0.5 text-sm text-muted">
              {m.director ? (
                <div>
                  <strong className="text-fg">{t.director}:</strong> {m.director}
                </div>
              ) : null}
              {m.writers?.length ? (
                <div>
                  <strong className="text-fg">{t.writers}:</strong> {m.writers.join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}

          {(m.actors || []).length ? (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold">{t.cast}</h3>
              <div className="hide-scroll flex gap-3 overflow-x-auto pb-1">
                {m.actors.slice(0, 16).map((a) => (
                  <button
                    key={`${a.id}-${a.name}`}
                    type="button"
                    className="w-[72px] shrink-0 text-center"
                    onClick={() => {
                      if (!a.id) return;
                      closeMovie();
                      nav("actors");
                      setPerson({ id: a.id, name: a.name, photo: a.photo });
                    }}
                  >
                    <div className="mx-auto size-14 overflow-hidden rounded-full bg-card">
                      {a.photo ? (
                        <img src={a.photo} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <div className="grid size-full place-items-center text-subtle">
                          <Clapperboard className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[11px] leading-tight font-medium">{a.name}</div>
                    {a.character ? <div className="line-clamp-1 text-[10px] text-subtle">{a.character}</div> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {m.trailerKey || m.trailerUrl ? (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold">{t.trailer}</h3>
              {m.trailerKey ? (
                <div className="aspect-video overflow-hidden rounded-lg bg-elevated">
                  <iframe
                    src={`https://www.youtube.com/embed/${m.trailerKey}`}
                    title={t.trailer}
                    allowFullScreen
                    className="h-full w-full border-0"
                    loading="lazy"
                  />
                </div>
              ) : m.trailerUrl && safeHttpUrl(m.trailerUrl) ? (
                <a
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm"
                  href={safeHttpUrl(m.trailerUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" /> {t.trailer}
                </a>
              ) : null}
            </div>
          ) : null}

          {(m.platforms || []).length ? (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold">{t.whereToWatch}</h3>
              <div className="flex flex-wrap gap-2">
                {m.platforms.map((p, i) => {
                  const href = safeHttpUrl(p.url);
                  return (
                    <div key={`${p.name}-${p.status}-${i}`} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
                      {p.logo ? <img src={p.logo} alt="" className="size-5 rounded-sm object-cover" /> : null}
                      <span>{p.name}</span>
                      <span className={`text-xs font-semibold ${statusClass(p.status)}`}>{statusLabel(p.status, t)}</span>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-accent">
                          {t.open}
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {lib?.myRating || lib?.notes || lib?.watchedDate ? (
            <div className="mt-5 text-sm">
              <h3 className="mb-1 font-semibold">{t.yourNotes}</h3>
              {lib.myRating ? (
                <div className="inline-flex items-center gap-1 tabular-nums">
                  <Star className="size-3.5" /> {lib.myRating}/10
                </div>
              ) : null}
              {lib.watchedDate ? (
                <div className="text-muted">
                  {t.watchDate}: {lib.watchedDate}
                </div>
              ) : null}
              {lib.notes ? <p className="text-muted">{lib.notes}</p> : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {m.imdbId ? (
              <a
                href={`https://www.imdb.com/title/${m.imdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-info"
              >
                {t.imdb}
              </a>
            ) : null}
            {m.tmdbId ? (
              <a
                href={`https://www.themoviedb.org/movie/${m.tmdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-info"
              >
                {t.tmdb}
              </a>
            ) : null}
          </div>

          {similar.length ? (
            <div className="mt-6">
              <Carousel title={t.similar} movies={similar} library={library} onOpen={(id) => useApp.getState().openMovie(id)} />
            </div>
          ) : null}
          {recs.length ? (
            <div className="mt-4">
              <Carousel title={t.recommendations} movies={recs} library={library} onOpen={(id) => useApp.getState().openMovie(id)} />
            </div>
          ) : null}
        </div>
      </div>
      {rateOpen ? <RateSheet movie={m} onClose={() => setRateOpen(false)} /> : null}
    </div>
  );
}

function RateSheet({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const { getLib, upsertLib, dict: t, showToast, openMovie } = useApp();
  const e = getLib(movie.id);
  const [rating, setRating] = useState(e?.myRating || 0);
  const [notes, setNotes] = useState(e?.notes || "");
  const [date, setDate] = useState(e?.watchedDate || "");
  const [rewatch, setRewatch] = useState(e?.rewatchCount || 0);

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-overlay" onClick={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div className="w-full max-w-[560px] rounded-t-2xl bg-elevated p-5">
        <h3 className="text-lg font-semibold">{t.rateAndNotes}</h3>
        <p className="mb-3 text-sm text-muted">{movie.title}</p>
        <div className="mb-3 flex flex-wrap justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <button
              key={i}
              type="button"
              className={`grid size-9 place-items-center rounded-full text-sm font-medium ${i <= rating ? "bg-accent text-accent-fg" : "bg-card text-muted"}`}
              onClick={() => setRating(i)}
              aria-label={`${i}`}
              aria-pressed={i <= rating}
            >
              {i}
            </button>
          ))}
        </div>
        <p className="mb-3 text-center text-xs text-subtle">{t.rate} 1–10</p>
        <label className="mb-2 block text-xs text-muted">{t.watchDate}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mb-3 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
        />
        <label className="mb-2 block text-xs text-muted">{t.rewatch}</label>
        <input
          type="number"
          min={0}
          value={rewatch}
          onChange={(e) => setRewatch(Number(e.target.value) || 0)}
          className="mb-3 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.notes}
          className="mb-4 min-h-[72px] w-full rounded-md border border-border bg-surface p-3 text-sm"
        />
        <div className="flex gap-2">
          <Btn variant="ghost" className="flex-1" onClick={onClose}>
            {t.cancel}
          </Btn>
          <Btn
            variant="primary"
            className="flex-1"
            onClick={() => {
              upsertLib(movie.id, {
                title: movie.title,
                poster: movie.poster,
                year: movie.year,
                voteAvg: movie.rating,
                tmdbId: movie.tmdbId,
                myRating: rating,
                notes: notes.trim(),
                watchedDate: date || undefined,
                rewatchCount: rewatch,
              });
              showToast(t.saved);
              onClose();
              openMovie(movie.id);
            }}
          >
            {t.save}
          </Btn>
        </div>
      </div>
    </div>
  );
}
