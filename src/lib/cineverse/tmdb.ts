import { GENRE_MAP } from "./types";
import type { Movie, PersonResult } from "./types";

const IMG = "https://image.tmdb.org/t/p/";

type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const TTL = 1000 * 60 * 10;

export function clearTmdbCache() {
  cache.clear();
}

export class TmdbError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function tmdbFetch<T>(
  apiKey: string,
  path: string,
  params: Record<string, string | number> = {},
  signal?: AbortSignal,
): Promise<T> {
  if (!apiKey) throw new TmdbError("No API key");
  const qs = new URLSearchParams({
    api_key: apiKey,
    language: "en-IN",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const url = `https://api.themoviedb.org/3${path}?${qs}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;
  const r = await fetch(url, { signal });
  if (!r.ok) {
    if (r.status === 401) throw new TmdbError("Invalid TMDB API key", 401);
    throw new TmdbError(`HTTP ${r.status}`, r.status);
  }
  const data = (await r.json()) as T;
  cache.set(url, { at: Date.now(), data });
  if (cache.size > 100) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return data;
}

export function mapTmdbMovie(x: Record<string, unknown>, mediaType: "movie" | "tv" = "movie"): Movie {
  const genreIds = (x.genre_ids as number[] | undefined) || ((x.genres as { id: number }[] | undefined) || []).map((g) => g.id);
  const date = String((mediaType === "tv" ? x.first_air_date : x.release_date) || "");
  const posterPath = x.poster_path as string | null;
  const backdropPath = x.backdrop_path as string | null;
  const title = String(x.title || x.name || x.original_title || x.original_name || "Untitled");
  return {
    id: `tmdb-${x.id}`,
    tmdbId: Number(x.id),
    title,
    originalTitle: String(x.original_title || x.original_name || ""),
    poster: posterPath ? `${IMG}w500${posterPath}` : "",
    backdrop: backdropPath ? `${IMG}w1280${backdropPath}` : "",
    releaseDate: date,
    year: date ? Number(date.slice(0, 4)) : null,
    runtime: Number(x.runtime || x.episode_run_time || 0) || 0,
    genres: (genreIds || []).map((g) => GENRE_MAP[g] || String(g)).filter(Boolean),
    language: x.original_language === "hi" ? "Hindi" : String(x.original_language || ""),
    rating: Number((Number(x.vote_average || 0)).toFixed(1)),
    voteCount: Number(x.vote_count || 0),
    description: String(x.overview || ""),
    popularity: Number(x.popularity || 0),
    platforms: [],
    isFree: false,
    actors: [],
    director: "",
    trailerUrl: "",
    mediaType,
  };
}

interface Credits {
  cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null }>;
  crew?: Array<{ job: string; name: string }>;
}
interface Videos {
  results?: Array<{ site: string; type: string; key: string }>;
}
interface Providers {
  results?: {
    IN?: {
      link?: string;
      flatrate?: Array<{ provider_name: string; logo_path?: string }>;
      free?: Array<{ provider_name: string; logo_path?: string }>;
      ads?: Array<{ provider_name: string; logo_path?: string }>;
      rent?: Array<{ provider_name: string; logo_path?: string }>;
      buy?: Array<{ provider_name: string; logo_path?: string }>;
    };
  };
}

export async function enrichMovie(apiKey: string, m: Movie): Promise<Movie> {
  if (!apiKey || !m.tmdbId) return m;
  try {
    const path = m.mediaType === "tv" ? `/tv/${m.tmdbId}` : `/movie/${m.tmdbId}`;
    const d = await tmdbFetch<Record<string, unknown> & { credits?: Credits; videos?: Videos } & { "watch/providers"?: Providers }>(
      apiKey,
      path,
      { append_to_response: "credits,videos,watch/providers" },
    );
    m.runtime = Number(d.runtime || (Array.isArray(d.episode_run_time) ? d.episode_run_time[0] : 0) || m.runtime);
    m.genres = ((d.genres as { name: string }[]) || []).map((g) => g.name);
    m.actors = (d.credits?.cast || []).slice(0, 16).map((a) => ({
      name: a.name,
      character: a.character || "",
      photo: a.profile_path ? `${IMG}w185${a.profile_path}` : "",
      id: a.id,
    }));
    m.director = (d.credits?.crew || []).find((c) => c.job === "Director")?.name || "";
    m.writers = (d.credits?.crew || [])
      .filter((c) => c.job === "Writer" || c.job === "Screenplay")
      .slice(0, 5)
      .map((c) => c.name);
    const trailer = (d.videos?.results || []).find((v) => v.site === "YouTube" && v.type === "Trailer");
    m.trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : "";
    m.trailerKey = trailer?.key || "";
    const india = d["watch/providers"]?.results?.IN;
    const providers: Movie["platforms"] = [];
    const add = (arr: Array<{ provider_name: string; logo_path?: string }> | undefined, status: Movie["platforms"][number]["status"]) =>
      (arr || []).forEach((p) =>
        providers.push({
          name: p.provider_name,
          status,
          url: india?.link || "",
          logo: p.logo_path ? `${IMG}w92${p.logo_path}` : "",
        }),
      );
    add(india?.flatrate, "subscription");
    add(india?.free, "free");
    add(india?.ads, "ads");
    add(india?.rent, "rent");
    add(india?.buy, "buy");
    m.platforms = providers.filter((v, i, a) => a.findIndex((z) => z.name === v.name && z.status === v.status) === i);
    m.isFree = m.platforms.some((p) => p.status === "free" || p.status === "ads");
    m.description = String(d.overview || m.description || "");
    m.tagline = String(d.tagline || "");
    m.imdbId = String(d.imdb_id || "");
    if (d.poster_path) m.poster = `${IMG}w500${d.poster_path}`;
    if (d.backdrop_path) m.backdrop = `${IMG}w1280${d.backdrop_path}`;
    m.voteCount = Number(d.vote_count || m.voteCount || 0);
    m.rating = Number(Number(d.vote_average || m.rating || 0).toFixed(1));
  } catch (e) {
    console.warn(e);
  }
  return m;
}

export async function searchMulti(
  apiKey: string,
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<{ movies: Movie[]; tv: Movie[]; people: PersonResult[]; totalPages: number }> {
  if (!apiKey || !query) return { movies: [], tv: [], people: [], totalPages: 0 };
  const d = await tmdbFetch<{ results?: Record<string, unknown>[]; total_pages?: number }>(
    apiKey,
    "/search/multi",
    { query, include_adult: "false", page },
    signal,
  );
  const results = d.results || [];
  const movies = results.filter((x) => x.media_type === "movie").map((x) => mapTmdbMovie(x, "movie"));
  const tv = results.filter((x) => x.media_type === "tv").map((x) => mapTmdbMovie(x, "tv"));
  const people = results
    .filter((x) => x.media_type === "person")
    .map(
      (p) =>
        ({
          id: Number(p.id),
          name: String(p.name || ""),
          photo: p.profile_path ? `${IMG}w185${p.profile_path}` : "",
          knownFor: String(p.known_for_department || ""),
        }) satisfies PersonResult,
    );
  return { movies, tv, people, totalPages: d.total_pages || 1 };
}

export async function searchPerson(apiKey: string, query: string): Promise<PersonResult[]> {
  const d = await tmdbFetch<{ results?: Record<string, unknown>[] }>(apiKey, "/search/person", {
    query,
    include_adult: "false",
  });
  return (d.results || []).slice(0, 12).map((p) => ({
    id: Number(p.id),
    name: String(p.name || ""),
    photo: p.profile_path ? `${IMG}w185${p.profile_path}` : "",
    knownFor: String(p.known_for_department || ""),
  }));
}

export async function fetchPerson(
  apiKey: string,
  id: number,
): Promise<{ person: PersonResult; movies: Movie[] }> {
  const p = await tmdbFetch<Record<string, unknown> & { combined_credits?: { cast?: Record<string, unknown>[] } }>(
    apiKey,
    `/person/${id}`,
    { append_to_response: "combined_credits" },
  );
  const person: PersonResult = {
    id,
    name: String(p.name || ""),
    photo: p.profile_path ? `${IMG}w185${p.profile_path}` : "",
    biography: String(p.biography || ""),
    birthday: String(p.birthday || ""),
    placeOfBirth: String(p.place_of_birth || ""),
    knownFor: String(p.known_for_department || ""),
  };
  const movies = (p.combined_credits?.cast || [])
    .filter((x) => x.media_type === "movie")
    .slice(0, 48)
    .map((x) => mapTmdbMovie(x, "movie"));
  return { person, movies };
}

export async function fetchSimilar(apiKey: string, tmdbId: number, mediaType: "movie" | "tv" = "movie"): Promise<Movie[]> {
  const d = await tmdbFetch<{ results?: Record<string, unknown>[] }>(apiKey, `/${mediaType}/${tmdbId}/similar`);
  return (d.results || []).slice(0, 12).map((x) => mapTmdbMovie(x, mediaType));
}

export async function fetchRecs(apiKey: string, tmdbId: number, mediaType: "movie" | "tv" = "movie"): Promise<Movie[]> {
  const d = await tmdbFetch<{ results?: Record<string, unknown>[] }>(apiKey, `/${mediaType}/${tmdbId}/recommendations`);
  return (d.results || []).slice(0, 12).map((x) => mapTmdbMovie(x, mediaType));
}

export async function fetchTrending(apiKey: string, window: "day" | "week" = "day"): Promise<Movie[]> {
  const d = await tmdbFetch<{ results?: Record<string, unknown>[] }>(apiKey, `/trending/movie/${window}`, {
    region: "IN",
  });
  return (d.results || []).map((x) => mapTmdbMovie(x, "movie"));
}

export async function syncLiveMovies(apiKey: string): Promise<Movie[]> {
  const results: Record<string, unknown>[] = [];
  const pull = async (path: string, params: Record<string, string | number>) => {
    try {
      const d = await tmdbFetch<{ results?: Record<string, unknown>[] }>(apiKey, path, params);
      if (d?.results) results.push(...d.results);
    } catch {
      /* continue */
    }
  };
  for (let p = 1; p <= 3; p++) {
    await pull("/discover/movie", {
      with_original_language: "hi",
      region: "IN",
      sort_by: "popularity.desc",
      page: p,
      include_adult: "false",
    });
  }
  await pull("/movie/now_playing", { region: "IN", page: 1 });
  await pull("/movie/upcoming", { region: "IN", page: 1 });
  await pull("/trending/movie/week", { region: "IN" });
  if (!results.length) throw new TmdbError("0 results");
  const byId = new Map<number, Record<string, unknown>>();
  results.forEach((x) => {
    if (x?.id) byId.set(Number(x.id), x);
  });
  return [...byId.values()].map((x) => mapTmdbMovie(x, "movie"));
}

export async function discoverMovies(
  apiKey: string,
  opts: {
    page?: number;
    genre?: string;
    year?: number;
    language?: string;
    sort?: string;
    rating?: number;
  } = {},
  signal?: AbortSignal,
): Promise<{ movies: Movie[]; totalPages: number }> {
  const genreId = Object.entries(GENRE_MAP).find(([, n]) => n.toLowerCase() === (opts.genre || "").toLowerCase())?.[0];
  const params: Record<string, string | number> = {
    page: opts.page || 1,
    include_adult: "false",
    region: "IN",
    sort_by: opts.sort || "popularity.desc",
  };
  if (genreId) params.with_genres = genreId;
  if (opts.year) params.primary_release_year = opts.year;
  if (opts.language) params.with_original_language = opts.language === "Hindi" ? "hi" : opts.language === "English" ? "en" : opts.language;
  if (opts.rating) params["vote_average.gte"] = opts.rating;
  const d = await tmdbFetch<{ results?: Record<string, unknown>[]; total_pages?: number }>(
    apiKey,
    "/discover/movie",
    params,
    signal,
  );
  return { movies: (d.results || []).map((x) => mapTmdbMovie(x, "movie")), totalPages: d.total_pages || 1 };
}
