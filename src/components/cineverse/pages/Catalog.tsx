import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useApp } from "@/lib/cineverse/store";
import type { Movie } from "@/lib/cineverse/types";
import { Btn, Chip, EmptyState, MovieGrid, SelectInput } from "../widgets";

export function MoviesPage() {
  const { catalog, library, dict: t, openMovie, settings } = useApp();
  const [sort, setSort] = useState(settings.defaultSort || "popularity");
  const [genre, setGenre] = useState("all");
  const list = useMemo(() => {
    let items = [...catalog];
    if (genre !== "all") items = items.filter((m) => (m.genres || []).some((g) => g.toLowerCase() === genre.toLowerCase()));
    if (sort === "newest") items.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (sort === "oldest") items.sort((a, b) => (a.year || 0) - (b.year || 0));
    else if (sort === "rating-high") items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === "rating-low") items.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    else items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return items;
  }, [catalog, sort, genre]);
  return (
    <CatalogLayout title={t.movies}>
      <div className="mb-4 flex flex-wrap gap-2">
        <SelectInput value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="popularity">{t.popularity}</option>
          <option value="newest">{t.newest}</option>
          <option value="oldest">{t.oldest}</option>
          <option value="rating-high">{t.ratingHigh}</option>
          <option value="rating-low">{t.ratingLow}</option>
        </SelectInput>
        {["all", "Action", "Comedy", "Drama", "Romance", "Thriller"].map((g) => (
          <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>
            {g === "all" ? t.all : g}
          </Chip>
        ))}
      </div>
      {list.length ? <MovieGrid movies={list} library={library} onOpen={openMovie} /> : <EmptyState title={t.noResults} />}
    </CatalogLayout>
  );
}

export function BollywoodPage() {
  const { catalog, library, dict: t, openMovie } = useApp();
  const list = catalog.filter((m) => (m.language || "").toLowerCase() === "hindi");
  const movies = list.length ? list : catalog;
  return (
    <CatalogLayout title={t.bollywood} sub={`${movies.length} ${t.moviesLabel.toLowerCase()}`}>
      <MovieGrid movies={movies} library={library} onOpen={openMovie} />
    </CatalogLayout>
  );
}

export function FreePage() {
  const { catalog, library, dict: t, openMovie } = useApp();
  const list = catalog.filter((m) => m.isFree || (m.platforms || []).some((p) => p.status === "free" || p.status === "ads"));
  return (
    <CatalogLayout title={t.freeToWatch} sub={t.legalFree}>
      {list.length ? <MovieGrid movies={list} library={library} onOpen={openMovie} /> : <EmptyState title={t.emptyFree} />}
    </CatalogLayout>
  );
}

export function UpcomingPage() {
  const { catalog, library, dict: t, openMovie, upsertLib, addReminder, showToast } = useApp();
  const now = new Date().toISOString().slice(0, 10);
  let list = catalog.filter((m) => m.releaseDate && m.releaseDate > now);
  if (!list.length) list = catalog.filter((m) => (m.year || 0) >= new Date().getFullYear()).slice(0, 20);
  return (
    <CatalogLayout title={t.upcoming}>
      {list.length ? (
        <div className="space-y-3">
          {list.map((m) => (
            <UpcomingRow
              key={m.id}
              movie={m}
              onOpen={() => openMovie(m.id)}
              onWatchlist={() => {
                upsertLib(m.id, {
                  title: m.title,
                  poster: m.poster,
                  year: m.year,
                  inWatchlist: true,
                  tmdbId: m.tmdbId,
                });
                showToast(t.added);
              }}
              onNotify={async () => {
                if (!m.releaseDate) return;
                if ("Notification" in window) {
                  const perm = await Notification.requestPermission();
                  if (perm !== "granted") {
                    showToast("Notifications blocked");
                    return;
                  }
                }
                addReminder({ id: m.id, title: m.title, date: m.releaseDate, createdAt: Date.now() });
                showToast(t.notified);
              }}
              t={t}
            />
          ))}
        </div>
      ) : (
        <EmptyState title={t.emptyUpcoming} />
      )}
    </CatalogLayout>
  );
}

function UpcomingRow({
  movie,
  onOpen,
  onWatchlist,
  onNotify,
  t,
}: {
  movie: Movie;
  onOpen: () => void;
  onWatchlist: () => void;
  onNotify: () => void;
  t: { addWatchlist: string; notifyMe: string; daysAway: string };
}) {
  const days = movie.releaseDate
    ? Math.max(0, Math.ceil((new Date(movie.releaseDate).getTime() - Date.now()) / 86400000))
    : 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="font-medium">{movie.title}</div>
        <div className="text-xs text-muted">
          {movie.releaseDate} · {days} {t.daysAway}
        </div>
      </button>
      <Btn size="sm" variant="ghost" onClick={onWatchlist}>
        {t.addWatchlist}
      </Btn>
      <Btn size="sm" variant="outline" onClick={onNotify} aria-label={t.notifyMe}>
        <Bell className="size-4" />
      </Btn>
    </div>
  );
}

function CatalogLayout({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="anim-enter pb-8">
      <h1 className="font-display text-3xl">{title}</h1>
      {sub ? <p className="mt-1 mb-4 text-sm text-muted">{sub}</p> : <div className="mb-4" />}
      {children}
    </div>
  );
}

export function TimelinePage() {
  const { catalog, library, dict: t, openMovie } = useApp();
  const years = [...new Set(catalog.map((m) => m.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a)) as number[];
  const [y, setY] = useState<"all" | number>("all");
  const list = (y === "all" ? catalog : catalog.filter((m) => m.year === y))
    .slice()
    .sort((a, b) => (b.year || 0) - (a.year || 0) || (b.rating || 0) - (a.rating || 0))
    .slice(0, 80);
  return (
    <div className="anim-enter pb-8">
      <h1 className="font-display text-3xl">{t.timeline}</h1>
      <p className="mt-1 mb-3 text-sm text-muted">
        {t.moviesLabel}: <strong>{catalog.length}</strong>
      </p>
      <div className="hide-scroll mb-4 flex gap-2 overflow-x-auto pb-1">
        <Chip active={y === "all"} onClick={() => setY("all")}>
          {t.all}
        </Chip>
        {years.slice(0, 25).map((yr) => (
          <Chip key={yr} active={y === yr} onClick={() => setY(yr)}>
            {yr}
          </Chip>
        ))}
      </div>
      <MovieGrid movies={list} library={library} onOpen={openMovie} />
    </div>
  );
}
