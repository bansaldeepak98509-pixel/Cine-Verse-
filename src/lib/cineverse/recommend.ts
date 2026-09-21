import type { LibEntry, Movie, Settings, TrackerItem } from "./types";

export interface ScoredMovie {
  movie: Movie;
  score: number;
  reason: string;
}

function watchedTitles(library: LibEntry[], tracker: TrackerItem[]): Set<string> {
  const s = new Set<string>();
  library.filter((m) => m.watched).forEach((m) => s.add((m.title || "").toLowerCase()));
  tracker.filter((m) => m.watched).forEach((m) => s.add(m.name.toLowerCase()));
  return s;
}

function favoriteGenres(library: LibEntry[], tracker: TrackerItem[], catalog: Movie[]): string[] {
  const counts = new Map<string, number>();
  const bump = (g?: string[], weight = 1) =>
    (g || []).forEach((x) => counts.set(x, (counts.get(x) || 0) + weight));
  library.forEach((m) => {
    const cat = catalog.find((c) => String(c.id) === String(m.id) || String(c.tmdbId) === String(m.tmdbId));
    const genres = m.genres || cat?.genres;
    bump(genres, m.favorite ? 3 : m.watched ? 2 : m.inWatchlist ? 1 : 0);
  });
  tracker.forEach((m) => {
    if (m.favorite || m.watched) bump(m.genres, m.favorite ? 3 : 2);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
}

function favoritePeople(library: LibEntry[], catalog: Movie[]): { actors: string[]; directors: string[] } {
  const actors = new Map<string, number>();
  const directors = new Map<string, number>();
  library
    .filter((m) => m.favorite || m.watched || (m.myRating && m.myRating >= 4))
    .forEach((m) => {
      const cat = catalog.find((c) => String(c.id) === String(m.id) || String(c.tmdbId) === String(m.tmdbId));
      if (cat?.director) directors.set(cat.director, (directors.get(cat.director) || 0) + 1);
      (cat?.actors || []).forEach((a) => actors.set(a.name, (actors.get(a.name) || 0) + 1));
    });
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n);
  return { actors: top(actors), directors: top(directors) };
}

export function scoreCatalog(
  catalog: Movie[],
  library: LibEntry[],
  tracker: TrackerItem[],
  settings: Settings,
): ScoredMovie[] {
  const seen = watchedTitles(library, tracker);
  const genres = favoriteGenres(library, tracker, catalog);
  const people = favoritePeople(library, catalog);
  const prefLang = settings.preferredLanguage;
  const prefPlat = settings.preferredPlatforms;
  const prefGenres = settings.preferredGenres;

  return catalog
    .filter((m) => !seen.has((m.title || "").toLowerCase()))
    .map((movie) => {
      let score = (movie.rating || 0) * 2 + (movie.popularity || 0) / 20;
      const reasons: string[] = [];
      const mg = movie.genres || [];
      const matchedGenres = mg.filter((g) => genres.includes(g) || prefGenres.includes(g));
      if (matchedGenres.length) {
        score += matchedGenres.length * 8;
        reasons.push(matchedGenres[0]);
      }
      const matchedActors = (movie.actors || []).filter((a) => people.actors.includes(a.name));
      if (matchedActors.length) {
        score += 12;
        reasons.push(matchedActors[0].name);
      }
      if (movie.director && people.directors.includes(movie.director)) {
        score += 10;
        reasons.push(movie.director);
      }
      if (prefLang && movie.language && movie.language.toLowerCase() === prefLang.toLowerCase()) score += 6;
      if (prefPlat.length && movie.platforms.some((p) => prefPlat.some((x) => p.name.toLowerCase().includes(x.toLowerCase()))))
        score += 5;
      if ((movie.runtime || 0) > 0 && (movie.runtime || 0) <= 130) score += 2;
      if ((movie.rating || 0) >= 8) score += 4;
      const reason =
        reasons.length >= 2
          ? `Because you liked ${reasons[0]} and ${reasons[1]}`
          : reasons.length === 1
            ? `Because you liked ${reasons[0]}`
            : (movie.rating || 0) >= 8
              ? "Highly rated pick"
              : "Popular in catalog";
      return { movie, score, reason };
    })
    .sort((a, b) => b.score - a.score);
}

export function becauseYouWatched(
  catalog: Movie[],
  library: LibEntry[],
): { seed: string; items: Movie[] } | null {
  const last = [...library]
    .filter((m) => m.watched)
    .sort((a, b) => (b.updatedAt || b.addedAt || 0) - (a.updatedAt || a.addedAt || 0))[0];
  if (!last) return null;
  const seed = last.title || "this";
  const seedMovie = catalog.find((c) => String(c.id) === String(last.id) || (last.title && c.title === last.title));
  const genres = last.genres || seedMovie?.genres || [];
  if (!genres.length) return { seed, items: catalog.slice(0, 8) };
  const items = catalog
    .filter((m) => m.id !== last.id && (m.genres || []).some((g) => genres.includes(g)))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 12);
  return { seed, items };
}

export function hiddenGems(catalog: Movie[], library: LibEntry[]): Movie[] {
  const seen = new Set(library.map((m) => (m.title || "").toLowerCase()));
  return catalog
    .filter((m) => !seen.has(m.title.toLowerCase()) && (m.rating || 0) >= 8 && (m.popularity || 0) < 85)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 12);
}

export function becauseYouLike(
  catalog: Movie[],
  library: LibEntry[],
  tracker: TrackerItem[],
): { genre: string; items: Movie[] }[] {
  const seen = watchedTitles(library, tracker);
  const genres = favoriteGenres(library, tracker, catalog).slice(0, 3);
  return genres
    .map((genre) => ({
      genre,
      items: catalog
        .filter((m) => !seen.has((m.title || "").toLowerCase()) && (m.genres || []).some((g) => g === genre))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 12),
    }))
    .filter((x) => x.items.length);
}

export function tonightPick(catalog: Movie[], library: LibEntry[], tracker: TrackerItem[], settings: Settings): Movie | null {
  const scored = scoreCatalog(catalog, library, tracker, settings).filter((s) => (s.movie.runtime || 180) <= 150);
  return scored[0]?.movie || catalog[0] || null;
}

export function pickFromTracker(items: TrackerItem[], excludeId?: string): TrackerItem | null {
  if (!items.length) return null;
  const unwatched = items.filter((x) => !x.watched);
  const prefer = unwatched.length ? unwatched : items;
  const without = excludeId ? prefer.filter((x) => x.id !== excludeId) : prefer;
  const source = without.length ? without : prefer;
  const weighted: TrackerItem[] = [];
  for (const x of source) {
    weighted.push(x);
    if (x.favorite) weighted.push(x);
  }
  return weighted[Math.floor(Math.random() * weighted.length)] ?? null;
}

export function underTwoHours(catalog: Movie[]): Movie[] {
  return catalog
    .filter((m) => m.runtime && m.runtime > 0 && m.runtime <= 120)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 16);
}

export function filterWizard(
  catalog: Movie[],
  opts: {
    mood?: string;
    genre?: string;
    language?: string;
    runtimeMax?: number;
    minRating?: number;
    yearFrom?: number;
    yearTo?: number;
    platform?: string;
    freeOnly?: boolean;
    unwatchedOnly?: boolean;
    watchedTitles?: Set<string>;
  },
): ScoredMovie[] {
  return catalog
    .filter((m) => {
      if (opts.mood && !(m.genres || []).some((g) => g.toLowerCase().includes(opts.mood!.toLowerCase()))) return false;
      if (opts.genre && opts.genre !== "all" && !(m.genres || []).some((g) => g.toLowerCase() === opts.genre!.toLowerCase()))
        return false;
      if (opts.language && opts.language !== "all" && (m.language || "").toLowerCase() !== opts.language.toLowerCase())
        return false;
      if (opts.runtimeMax && (m.runtime || 0) > opts.runtimeMax) return false;
      if (opts.minRating && (m.rating || 0) < opts.minRating) return false;
      if (opts.yearFrom && (m.year || 0) < opts.yearFrom) return false;
      if (opts.yearTo && (m.year || 9999) > opts.yearTo) return false;
      if (opts.platform && opts.platform !== "all" && !(m.platforms || []).some((p) => p.name.toLowerCase().includes(opts.platform!.toLowerCase())))
        return false;
      if (opts.freeOnly && !m.isFree && !(m.platforms || []).some((p) => p.status === "free" || p.status === "ads"))
        return false;
      if (opts.unwatchedOnly && opts.watchedTitles?.has((m.title || "").toLowerCase())) return false;
      return true;
    })
    .map((movie) => ({
      movie,
      score: (movie.rating || 0) * 10 + (movie.popularity || 0) / 10,
      reason: opts.mood ? `Matches ${opts.mood}` : "Matches your filters",
    }))
    .sort((a, b) => b.score - a.score);
}

export function computeStreaks(library: LibEntry[]): { current: number; longest: number } {
  const days = [
    ...new Set(
      library
        .filter((m) => m.watchedDate)
        .map((m) => m.watchedDate as string)
        .filter(Boolean),
    ),
  ].sort();
  if (!days.length) return { current: 0, longest: 0 };
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]).getTime();
    const cur = new Date(days[i]).getTime();
    const diff = Math.round((cur - prev) / 86400000);
    if (diff === 1) {
      run++;
      longest = Math.max(longest, run);
    } else if (diff > 1) run = 1;
  }
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const last = days[days.length - 1];
  const current = last === today || last === yesterday ? run : 0;
  return { current, longest };
}

export function hoursWatched(library: LibEntry[], tracker: TrackerItem[], catalog: Movie[]): number {
  let mins = 0;
  library
    .filter((m) => m.watched)
    .forEach((m) => {
      const cat = catalog.find((c) => String(c.id) === String(m.id) || String(c.tmdbId) === String(m.tmdbId));
      const rt = m.runtime || cat?.runtime || 120;
      mins += rt * (1 + (m.rewatchCount || 0));
    });
  tracker
    .filter((m) => m.watched)
    .forEach((m) => {
      mins += (m.runtime || 120) * (1 + (m.rewatchCount || 0));
    });
  return Math.round((mins / 60) * 10) / 10;
}
