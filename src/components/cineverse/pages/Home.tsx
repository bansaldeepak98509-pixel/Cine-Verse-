import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Dices, Sparkles, Star, Timer, Wifi } from "lucide-react";
import { formatRuntime, safeHttpUrl } from "@/lib/utils";
import {
  becauseYouLike,
  becauseYouWatched,
  hiddenGems,
  scoreCatalog,
  tonightPick,
  underTwoHours,
} from "@/lib/cineverse/recommend";
import { useApp } from "@/lib/cineverse/store";
import type { Movie } from "@/lib/cineverse/types";
import { Btn, Carousel, PosterImg, SkeletonRow, StatCard } from "../widgets";

export function HomePage() {
  const { catalog, library, tracker, recentViewed, dict: t, nav, openMovie, upsertLib, showToast, settings, syncing } =
    useApp();
  const [heroIdx, setHeroIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const heroes = useMemo(() => {
    return catalog
      .filter((m) => m.backdrop || m.poster)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 8);
  }, [catalog]);

  useEffect(() => {
    if (heroes.length < 2 || paused) return;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % heroes.length), 7000);
    return () => clearInterval(id);
  }, [heroes.length, paused]);

  const featured = heroes[heroIdx] || catalog[0];
  const watched =
    library.filter((m) => m.watched).length + tracker.filter((m) => m.watched).length;
  const wl = library.filter((m) => m.inWatchlist).length;
  const fav = library.filter((m) => m.favorite).length + tracker.filter((m) => m.favorite).length;

  const trending = [...catalog].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 16);
  const week = [...catalog].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(4, 20);
  const topRated = [...catalog].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 16);
  const hindi = catalog.filter((m) => (m.language || "").toLowerCase() === "hindi").slice(0, 16);
  const english = catalog.filter((m) => (m.language || "").toLowerCase() === "english").slice(0, 16);
  const now = new Date().toISOString().slice(0, 10);
  const yearNow = new Date().getFullYear();
  const newRel = catalog
    .filter((m) => (m.year || 0) >= yearNow - 1)
    .sort((a, b) => String(b.releaseDate || "").localeCompare(String(a.releaseDate || "")))
    .slice(0, 16);
  const upcoming = catalog.filter((m) => m.releaseDate && m.releaseDate > now).slice(0, 16);
  const free = catalog.filter((m) => m.isFree).slice(0, 16);
  const continueList = library
    .filter((m) => m.inWatchlist && !m.watched && m.title)
    .slice(0, 12)
    .map(libToMovie);
  const byw = becauseYouWatched(catalog, library);
  const like = becauseYouLike(catalog, library, tracker);
  const wlMovies = library
    .filter((m) => m.inWatchlist && m.title)
    .slice(0, 12)
    .map(libToMovie);
  const favMovies = library
    .filter((m) => m.favorite && m.title)
    .slice(0, 12)
    .map(libToMovie);
  const scored = scoreCatalog(catalog, library, tracker, settings);
  const recs = scored.slice(0, 16);
  const gems = hiddenGems(catalog, library);
  const pick = tonightPick(catalog, library, tracker, settings);
  const perfect = scored[0];
  const short = underTwoHours(catalog);
  const high = catalog.filter((m) => (m.rating || 0) >= 8).slice(0, 16);
  const dow = new Date().getDay();
  const moods = ["Family", "Action", "Thriller", "Drama", "Comedy", "Romance", "Adventure"];
  const g = moods[dow];
  let today = catalog.filter((m) => (m.genres || []).some((x) => x.toLowerCase().includes(g.toLowerCase())));
  if (!today.length) today = catalog.slice(0, 8);
  today = today.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);

  const open = (id: string) => openMovie(id);

  function surprise() {
    if (!catalog.length) return;
    const m = catalog[Math.floor(Math.random() * catalog.length)];
    openMovie(m.id);
  }

  return (
    <div className="anim-enter space-y-8 pb-8">
      {featured ? (
        <section
          className="relative overflow-hidden rounded-xl bg-elevated md:rounded-2xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          aria-roledescription="carousel"
          aria-label={t.trendingToday}
        >
          <div className="absolute inset-0 overflow-hidden">
            {featured.backdrop || featured.poster ? (
              <img
                src={featured.backdrop || featured.poster}
                alt=""
                className="h-full w-full scale-110 object-cover object-top opacity-50 blur-md"
              />
            ) : null}
          </div>
          <div className="hero-side absolute inset-0" />
          <div className="hero-wash absolute inset-0" />
          <div className="relative z-10 grid min-h-[340px] items-end gap-6 p-5 md:min-h-[460px] md:grid-cols-[1fr_180px] md:p-10">
            <div>
              <p className="mb-2 text-xs tracking-[0.18em] text-fg/80 uppercase">{t.trendingToday}</p>
              <h1 className="font-display max-w-2xl text-3xl text-fg md:text-5xl">{featured.title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm text-fg/80">
                {featured.year ? <span>{featured.year}</span> : null}
                {featured.rating ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5" /> {featured.rating}
                  </span>
                ) : null}
                {featured.runtime ? <span>{formatRuntime(featured.runtime)}</span> : null}
                {(featured.genres || []).slice(0, 3).map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </p>
              <p className="mt-3 line-clamp-3 max-w-xl text-sm text-fg/85 md:line-clamp-2">{featured.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {featured.platforms.find((p) => p.url) ? (
                  <a
                    className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-fg"
                    href={safeHttpUrl(featured.platforms.find((p) => p.url)?.url || "") || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.watchNow}
                  </a>
                ) : null}
                <Btn
                  variant={featured.platforms.find((p) => p.url) ? "outline" : "primary"}
                  className={featured.platforms.find((p) => p.url) ? "border-fg/40 bg-elevated/80 text-fg" : undefined}
                  onClick={() => open(featured.id)}
                >
                  {t.details}
                </Btn>
                <Btn
                  className="bg-fg text-bg hover:opacity-90"
                  onClick={() => {
                    const e = useApp.getState().getLib(featured.id);
                    upsertLib(featured.id, {
                      title: featured.title,
                      poster: featured.poster,
                      year: featured.year,
                      voteAvg: featured.rating,
                      inWatchlist: !(e && e.inWatchlist),
                      tmdbId: featured.tmdbId,
                    });
                    showToast(!(e && e.inWatchlist) ? t.added : t.removed);
                  }}
                >
                  + {t.addWatchlist}
                </Btn>
              </div>
              {heroes.length > 1 ? (
                <div className="mt-5 flex items-center gap-2">
                  <button
                    type="button"
                    className="grid size-11 place-items-center rounded-full bg-elevated text-fg"
                    onClick={() => setHeroIdx((i) => (i - 1 + heroes.length) % heroes.length)}
                    aria-label={t.prev}
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  {heroes.map((h, i) => (
                    <button
                      key={h.id}
                      type="button"
                      aria-label={`${h.title}`}
                      aria-current={i === heroIdx}
                      className={`h-1.5 rounded-full transition-all ${i === heroIdx ? "w-6 bg-fg" : "w-2 bg-fg/40"}`}
                      onClick={() => setHeroIdx(i)}
                    />
                  ))}
                  <button
                    type="button"
                    className="grid size-11 place-items-center rounded-full bg-elevated text-fg"
                    onClick={() => setHeroIdx((i) => (i + 1) % heroes.length)}
                    aria-label={t.next}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="hidden justify-self-end md:block">
              <div className="w-[160px] overflow-hidden rounded-md ring-1 ring-border">
                <div className="aspect-[2/3]">
                  <PosterImg src={featured.poster} alt="" />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <button type="button" onClick={() => nav("movies")} className="text-left">
          <StatCard value={catalog.length} label={t.catalog} />
        </button>
        <button type="button" onClick={() => nav("watchlist")} className="text-left">
          <StatCard value={wl} label={t.watchlist} />
        </button>
        <button type="button" onClick={() => nav("tracker")} className="text-left">
          <StatCard value={watched} label={t.watched} color="text-ok" />
        </button>
        <button type="button" onClick={() => nav("favorites")} className="text-left">
          <StatCard value={fav} label={t.favorites} color="text-warn" />
        </button>
      </div>

      {pick ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs tracking-wide text-muted uppercase">{t.tonightPick}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">{pick.title}</h2>
              <p className="text-sm text-muted">
                {pick.year} {pick.rating ? `· ${pick.rating}` : ""} {pick.runtime ? `· ${formatRuntime(pick.runtime)}` : ""}
              </p>
              {perfect?.reason ? <p className="mt-1 text-xs text-subtle">{perfect.reason}</p> : null}
            </div>
            <Btn variant="primary" onClick={() => open(pick.id)}>{t.details}</Btn>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold">{t.whatToWatch}</h2>
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Btn size="sm" variant="primary" onClick={() => useApp.getState().setWizard(true)}>
            <Sparkles className="size-4" /> {t.helpChoose}
          </Btn>
          <Btn size="sm" variant="secondary" onClick={surprise}>
            <Dices className="size-4" /> {t.surpriseMe}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => pick && open(pick.id)}>
            <Sparkles className="size-4" /> {t.pickTonight}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => short[0] && open(short[0].id)}>
            <Timer className="size-4" /> {t.underTwoHours}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => high[0] && open(high[0].id)}>
            <Star className="size-4" /> {t.highlyRated}
          </Btn>
        </div>
        <Carousel title="" movies={today} library={library} onOpen={open} />
      </section>

      {syncing ? <SkeletonRow /> : null}

      {perfect ? (
        <Carousel
          title={t.perfectMatch}
          movies={recs.slice(0, 8).map((r) => r.movie)}
          library={library}
          onOpen={open}
          reason={perfect.reason}
        />
      ) : null}

      <Carousel title={t.trendingToday} seeAll={t.seeAll} onSeeAll={() => nav("movies")} movies={trending} library={library} onOpen={open} />
      <Carousel title={t.popularWeek} movies={week} library={library} onOpen={open} />
      <Carousel title={t.topRated} movies={topRated} library={library} onOpen={open} />
      <Carousel title={t.bollywoodHits} seeAll={t.seeAll} onSeeAll={() => nav("bollywood")} movies={catalog.slice(0, 16)} library={library} onOpen={open} />
      <Carousel title={t.hindiMovies} movies={hindi} library={library} onOpen={open} />
      {english.length ? <Carousel title={t.english} movies={english} library={library} onOpen={open} /> : null}
      <Carousel title={t.newReleases} movies={newRel} library={library} onOpen={open} />
      <Carousel title={t.upcoming} seeAll={t.seeAll} onSeeAll={() => nav("upcoming")} movies={upcoming} library={library} onOpen={open} />
      <Carousel title={t.freeToWatch} seeAll={t.seeAll} onSeeAll={() => nav("free")} movies={free} library={library} onOpen={open} />
      {short.length ? <Carousel title={t.underTwoHours} movies={short} library={library} onOpen={open} /> : null}
      {continueList.length ? <Carousel title={t.continueWatching} movies={continueList} library={library} onOpen={open} /> : null}
      {byw?.items.length ? (
        <Carousel
          title={`${t.becauseYouWatched} ${byw.seed}`}
          movies={byw.items}
          library={library}
          onOpen={open}
        />
      ) : null}
      {like.map((block) => (
        <Carousel
          key={block.genre}
          title={`${t.becauseLiked} ${block.genre}`}
          movies={block.items}
          library={library}
          onOpen={open}
          reason={`${t.becauseLiked} ${block.genre}`}
        />
      ))}
      {wlMovies.length ? <Carousel title={t.myWatchlist} seeAll={t.seeAll} onSeeAll={() => nav("watchlist")} movies={wlMovies} library={library} onOpen={open} /> : null}
      {favMovies.length ? <Carousel title={t.myFavorites} movies={favMovies} library={library} onOpen={open} /> : null}
      {recs.length ? (
        <Carousel
          title={t.recommendedForYou}
          movies={recs.map((r) => r.movie)}
          library={library}
          onOpen={open}
          reason={recs[0]?.reason}
        />
      ) : null}
      {gems.length ? <Carousel title={t.hiddenGems} movies={gems} library={library} onOpen={open} /> : null}
      {recentViewed.length ? <Carousel title={t.recentlyViewed} movies={recentViewed} library={library} onOpen={open} /> : null}
      {!settings.apiKey ? (
        <p className="flex items-center gap-2 text-xs text-subtle">
          <Wifi className="size-3.5" /> {t.demoMode}
        </p>
      ) : null}
    </div>
  );
}

function libToMovie(m: { id: string; title?: string; poster?: string; year?: number | null; voteAvg?: number; tmdbId?: number | string }): Movie {
  return {
    id: m.id,
    title: m.title || "Untitled",
    poster: m.poster || "",
    year: m.year,
    rating: m.voteAvg,
    tmdbId: typeof m.tmdbId === "number" ? m.tmdbId : undefined,
    genres: [],
    actors: [],
    platforms: [],
  };
}
