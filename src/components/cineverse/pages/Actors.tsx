import { useEffect, useState } from "react";
import { Heart, User } from "lucide-react";
import { DEMO_ACTORS } from "@/lib/cineverse/demo";
import { fetchPerson, searchPerson } from "@/lib/cineverse/tmdb";
import { useApp } from "@/lib/cineverse/store";
import { Btn, EmptyState, MovieGrid, TextInput } from "../widgets";

export function ActorsPage() {
  const { catalog, library, settings, dict: t, openMovie, person, personMovies, setPerson, toggleFavActor, favActors, tracker, showToast } =
    useApp();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!person?.id || !settings.apiKey) return;
    if (person.biography && personMovies.length) return;
    let cancelled = false;
    setLoading(true);
    fetchPerson(settings.apiKey, person.id)
      .then((res) => {
        if (!cancelled) setPerson(res.person, res.movies);
      })
      .catch(() => showToast(t.apiError))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [person?.id, settings.apiKey]);

  async function search() {
    const name = q.trim();
    if (!name) return;
    if (!settings.apiKey) {
      const local = catalog.filter((m) => (m.actors || []).some((a) => (a.name || "").toLowerCase().includes(name.toLowerCase())));
      setPerson({ id: 0, name }, local);
      return;
    }
    try {
      showToast(`${t.search} ${name}…`);
      const people = await searchPerson(settings.apiKey, name);
      const p = people[0];
      if (!p) {
        showToast(t.noResults);
        return;
      }
      setPerson(p);
    } catch {
      showToast(t.apiError);
    }
  }

  async function openDemo(name: string) {
    if (!settings.apiKey) {
      const list = catalog.filter((m) => (m.actors || []).some((a) => (a.name || "").toLowerCase().includes(name.toLowerCase())));
      setPerson({ id: 0, name }, list);
      return;
    }
    try {
      const people = await searchPerson(settings.apiKey, name);
      if (people[0]) setPerson(people[0]);
      else showToast(t.noResults);
    } catch {
      showToast(t.apiError);
    }
  }

  const inTracker = person
    ? tracker.filter((m) =>
        catalog.some(
          (c) =>
            c.title.toLowerCase() === m.name.toLowerCase() &&
            (c.actors || []).some((a) => a.name.toLowerCase() === person.name.toLowerCase()),
        ),
      )
    : [];

  return (
    <div className="anim-enter pb-8">
      <h1 className="font-display mb-4 text-3xl">{t.popularActors}</h1>
      <div className="mb-4 flex gap-2">
        <TextInput value={q} placeholder={t.searchActor} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <Btn variant="primary" onClick={search}>
          {t.search}
        </Btn>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {DEMO_ACTORS.map((a) => (
          <button
            key={a.name}
            type="button"
            className="rounded-lg border border-border bg-card p-3 text-center"
            onClick={() => openDemo(a.name)}
          >
            <div className="mx-auto mb-2 grid size-14 place-items-center rounded-full bg-elevated text-subtle">
              <User className="size-6" />
            </div>
            <div className="text-xs font-medium">{a.name}</div>
          </button>
        ))}
      </div>

      {person ? (
        <div className="mt-8">
          <div className="mb-4 flex items-start gap-4">
            <div className="size-20 overflow-hidden rounded-full bg-elevated">
              {person.photo ? <img src={person.photo} alt="" className="size-full object-cover" /> : <User className="mx-auto mt-5 size-10 text-subtle" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl">{person.name}</h2>
              {person.knownFor ? <p className="text-sm text-muted">{person.knownFor}</p> : null}
              {person.birthday || person.placeOfBirth ? (
                <p className="text-xs text-subtle">
                  {[person.birthday, person.placeOfBirth].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <Btn
                size="sm"
                variant={favActors.includes(person.name) ? "secondary" : "ghost"}
                className="mt-2"
                onClick={() => toggleFavActor(person.name)}
              >
                <Heart className={`size-4 ${favActors.includes(person.name) ? "fill-current text-accent" : ""}`} /> {t.actorFav}
              </Btn>
            </div>
          </div>
          {person.biography ? <p className="mb-4 text-sm text-muted">{person.biography}</p> : null}
          {loading ? <p className="text-sm text-muted">{t.loading}</p> : null}
          {inTracker.length ? (
            <p className="mb-2 text-sm text-muted">
              {t.inYourTracker}: {inTracker.map((x) => x.name).join(", ")}
            </p>
          ) : null}
          <h3 className="mb-3 text-base font-semibold">{t.filmography}</h3>
          {personMovies.length ? (
            <MovieGrid movies={personMovies} library={library} onOpen={openMovie} />
          ) : (
            <EmptyState title={settings.apiKey ? t.noResults : t.noApiKey} />
          )}
        </div>
      ) : null}
    </div>
  );
}
