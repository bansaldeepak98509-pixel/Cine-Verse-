import { useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, User } from "lucide-react";
import { searchMulti } from "@/lib/cineverse/tmdb";
import { useApp } from "@/lib/cineverse/store";
import type { Movie, PersonResult } from "@/lib/cineverse/types";
import { Chip, EmptyState, MovieGrid, SelectInput, TextInput } from "../widgets";

export function SearchPage({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { catalog, library, settings, dict: t, addSearch, searchHistory, clearSearchHistory, openMovie, nav, setPerson, showToast } =
    useApp();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [tv, setTv] = useState<Movie[]>([]);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [genre, setGenre] = useState("all");
  const [year, setYear] = useState("");
  const [lang, setLang] = useState("all");
  const [minRating, setMinRating] = useState("");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState("popularity");
  const [runtimeMax, setRuntimeMax] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setMovies([]);
      setTv([]);
      setPeople([]);
      setLoading(false);
      return;
    }
    addSearch(q);
    setLoading(true);
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    const tmr = setTimeout(async () => {
      const ql = q.toLowerCase();
      const local = catalog.filter(
        (m) =>
          (m.title || "").toLowerCase().includes(ql) ||
          (m.genres || []).some((g) => g.toLowerCase().includes(ql)) ||
          (m.actors || []).some((a) => (a.name || "").toLowerCase().includes(ql)),
      );
      let remoteM: Movie[] = [];
      let remoteTv: Movie[] = [];
      let remoteP: PersonResult[] = [];
      let pages = 1;
      if (settings.apiKey) {
        try {
          const res = await searchMulti(settings.apiKey, q, 1, ac.signal);
          remoteM = res.movies;
          remoteTv = res.tv;
          remoteP = res.people;
          pages = res.totalPages;
        } catch (e) {
          if ((e as Error).name !== "AbortError") showToast(t.apiError);
        }
      }
      if (ac.signal.aborted) return;
      const byTitle = new Map<string, Movie>();
      local.forEach((m) => byTitle.set((m.title || "").toLowerCase(), m));
      remoteM.forEach((m) => byTitle.set((m.title || "").toLowerCase(), m));
      setMovies([...byTitle.values()]);
      setTv(remoteTv);
      setPeople(remoteP);
      setTotalPages(pages);
      setPage(1);
      setLoading(false);
    }, 350);
    return () => {
      clearTimeout(tmr);
      ac.abort();
    };
  }, [query, catalog, settings.apiKey]);

  const filtered = useMemo(() => {
    let list = [...movies];
    if (genre !== "all") list = list.filter((m) => (m.genres || []).some((g) => g.toLowerCase() === genre.toLowerCase()));
    if (year) list = list.filter((m) => String(m.year) === year);
    if (lang !== "all") list = list.filter((m) => (m.language || "").toLowerCase() === lang.toLowerCase());
    if (minRating) list = list.filter((m) => (m.rating || 0) >= Number(minRating));
    if (runtimeMax) list = list.filter((m) => !m.runtime || m.runtime <= Number(runtimeMax));
    if (platform !== "all")
      list = list.filter((m) => (m.platforms || []).some((p) => p.name.toLowerCase().includes(platform.toLowerCase())));
    if (sort === "newest") list.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (sort === "rating") list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return list;
  }, [movies, genre, year, lang, minRating, platform, sort, runtimeMax]);

  async function loadMore() {
    if (!settings.apiKey || page >= totalPages) return;
    const next = page + 1;
    try {
      const res = await searchMulti(settings.apiKey, query.trim(), next);
      setMovies((prev) => {
        const by = new Map(prev.map((m) => [m.title.toLowerCase(), m]));
        res.movies.forEach((m) => by.set(m.title.toLowerCase(), m));
        return [...by.values()];
      });
      setTv((prev) => [...prev, ...res.tv]);
      setPage(next);
    } catch {
      showToast(t.apiError);
    }
  }

  return (
    <div className="anim-enter space-y-4 pb-8">
      <h1 className="font-display text-3xl">{t.search}</h1>
      {!query ? (
        <>
          {searchHistory.length ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm text-muted">{t.recent}</h3>
                <button type="button" className="text-sm text-accent" onClick={clearSearchHistory}>
                  {t.clearRecent}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((q) => (
                  <Chip key={q} onClick={() => setQuery(q)}>
                    {q}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}
          <EmptyState icon={<SearchIcon className="size-9" />} title={t.emptySearch} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <SelectInput value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="all">{t.genre}</option>
              {["Action", "Comedy", "Drama", "Romance", "Thriller", "War", "Crime", "Family"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </SelectInput>
            <TextInput
              placeholder={t.year}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-11 w-24 rounded-full"
              inputMode="numeric"
            />
            <SelectInput value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="all">{t.allLanguages}</option>
              <option value="hindi">{t.hindi}</option>
              <option value="english">{t.english}</option>
            </SelectInput>
            <SelectInput value={minRating} onChange={(e) => setMinRating(e.target.value)}>
              <option value="">{t.minRating}</option>
              <option value="6">6+</option>
              <option value="7">7+</option>
              <option value="8">8+</option>
            </SelectInput>
            <SelectInput value={runtimeMax} onChange={(e) => setRuntimeMax(e.target.value)}>
              <option value="">{t.runtime}</option>
              <option value="90">90m</option>
              <option value="120">2h</option>
              <option value="150">2.5h</option>
            </SelectInput>
            <SelectInput value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="all">{t.platform}</option>
              {["Netflix", "Prime Video", "JioHotstar", "ZEE5", "SonyLIV", "YouTube"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </SelectInput>
            <SelectInput value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="popularity">{t.popularity}</option>
              <option value="newest">{t.newest}</option>
              <option value="rating">{t.ratingHigh}</option>
            </SelectInput>
          </div>
          {loading ? <p className="text-sm text-muted">{t.searching}</p> : null}
          {people.length ? (
            <div>
              <h2 className="mb-2 text-base font-semibold">{t.people}</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {people.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="rounded-lg border border-border bg-card p-3 text-center"
                    onClick={() => {
                      nav("actors");
                      setPerson(p);
                    }}
                  >
                    <div className="mx-auto mb-2 size-16 overflow-hidden rounded-full bg-elevated">
                      {p.photo ? <img src={p.photo} alt="" className="size-full object-cover" /> : <User className="mx-auto mt-4 size-8 text-subtle" />}
                    </div>
                    <div className="line-clamp-2 text-xs font-medium">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {tv.length ? (
            <div>
              <h2 className="mb-2 text-base font-semibold">{t.tvShows}</h2>
              <MovieGrid movies={tv.slice(0, 12)} library={library} onOpen={openMovie} />
            </div>
          ) : null}
          {filtered.length ? (
            <div>
              <h2 className="mb-2 text-base font-semibold">
                {t.moviesLabel} ({filtered.length})
              </h2>
              <MovieGrid movies={filtered} library={library} onOpen={openMovie} />
              {page < totalPages && settings.apiKey ? (
                <div className="mt-4 text-center">
                  <button type="button" className="h-11 rounded-full border border-border px-5 text-sm" onClick={loadMore}>
                    {t.loadMore}
                  </button>
                </div>
              ) : null}
            </div>
          ) : !loading ? (
            <EmptyState title={`${t.noResults} “${query}”`} />
          ) : null}
        </>
      )}
    </div>
  );
}
