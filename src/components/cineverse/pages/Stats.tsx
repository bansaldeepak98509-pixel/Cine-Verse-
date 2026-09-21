import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { computeStreaks, hoursWatched } from "@/lib/cineverse/recommend";
import { useApp } from "@/lib/cineverse/store";
import { ProgressBar, StatCard } from "../widgets";

export function StatsPage() {
  const { library, tracker, catalog, dict: t } = useApp();
  const watched = library.filter((m) => m.watched).length + tracker.filter((m) => m.watched).length;
  const total = library.length + tracker.length;
  const fav = library.filter((m) => m.favorite).length + tracker.filter((m) => m.favorite).length;
  const wl = library.filter((m) => m.inWatchlist).length;
  const ratedLib = library.filter((m) => (m.myRating || 0) > 0);
  const ratedTr = tracker.filter((m) => (m.rating || 0) > 0);
  const ratedSum = ratedLib.reduce((s, m) => s + (m.myRating || 0), 0) + ratedTr.reduce((s, m) => s + (m.rating || 0), 0);
  const ratedCount = ratedLib.length + ratedTr.length;
  const avg = ratedCount ? (ratedSum / ratedCount).toFixed(1) : "—";
  const pct = total ? Math.round((watched / total) * 100) : 0;
  const hours = hoursWatched(library, tracker, catalog);
  const streaks = computeStreaks(library);

  const genreCounts = useMemo(() => {
    const c: Record<string, number> = {};
    library.concat().forEach((m) => {
      const cat = catalog.find((x) => String(x.id) === String(m.id));
      (m.genres || cat?.genres || []).forEach((g) => (c[g] = (c[g] || 0) + (m.watched ? 2 : 1)));
    });
    tracker.forEach((m) => (m.genres || []).forEach((g) => (c[g] = (c[g] || 0) + 1)));
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [library, tracker, catalog]);

  const yearCounts = useMemo(() => {
    const c: Record<string, number> = {};
    [...library, ...tracker].forEach((m) => {
      const y = (m as { year?: number }).year || (m.addedAt ? new Date(m.addedAt).getFullYear() : "—");
      c[String(y)] = (c[String(y)] || 0) + 1;
    });
    return Object.entries(c)
      .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [library, tracker]);

  const monthly = useMemo(() => {
    const c: Record<string, number> = {};
    library
      .filter((m) => m.watchedDate)
      .forEach((m) => {
        const k = (m.watchedDate as string).slice(0, 7);
        c[k] = (c[k] || 0) + 1;
      });
    return Object.entries(c)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([name, count]) => ({ name: name.slice(2), count }));
  }, [library]);

  const ratingDist = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({ name: `${i + 1}`, count: 0 }));
    library.forEach((m) => {
      const r = m.myRating;
      if (r && r >= 1 && r <= 10) buckets[r - 1].count++;
    });
    tracker.forEach((m) => {
      const r = m.rating;
      if (r && r >= 1 && r <= 10) buckets[r - 1].count++;
    });
    return buckets;
  }, [library, tracker]);

  const favGenre = genreCounts[0]?.name || "—";
  const actors: Record<string, number> = {};
  const directors: Record<string, number> = {};
  library
    .filter((m) => m.watched || m.favorite)
    .forEach((m) => {
      const cat = catalog.find((x) => String(x.id) === String(m.id) || x.title === m.title);
      if (cat?.director) directors[cat.director] = (directors[cat.director] || 0) + 1;
      (cat?.actors || []).forEach((a) => (actors[a.name] = (actors[a.name] || 0) + 1));
    });
  const favActor = Object.entries(actors).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const favDir = Object.entries(directors).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const tooltipStyle = { background: "var(--cv-elevated)", border: "1px solid var(--cv-border)", borderRadius: 8, fontSize: 12 };

  return (
    <div className="anim-enter space-y-6 pb-8">
      <h1 className="font-display text-3xl">{t.stats}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={watched} label={t.moviesWatched} color="text-ok" />
        <StatCard value={hours} label={t.hoursWatched} />
        <StatCard value={avg} label={t.avgRating} color="text-warn" />
        <StatCard value={fav} label={t.favorites} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={favGenre} label={t.favGenre} />
        <StatCard value={favActor} label={t.favActor} />
        <StatCard value={favDir} label={t.favDirector} />
        <StatCard value={streaks.current} label={`${t.watchStreak} (${t.longestStreak} ${streaks.longest})`} />
      </div>
      <ProgressBar value={pct} label={`${t.completion} · ${watched}/${total}`} />

      <ChartBlock title={t.byGenre} data={genreCounts} />
      <ChartBlock title={t.mostWatchedYears} data={yearCounts} />
      <ChartBlock title={t.monthlyActivity} data={monthly} />
      <ChartBlock title={t.ratingDist} data={ratingDist} />

      <div>
        <h3 className="mb-2 text-sm font-semibold">{t.byStatus}</h3>
        {[
          [t.watched, watched],
          [t.onWatchlist, wl],
          [t.favorites, fav],
        ].map(([label, count]) => {
          const max = Math.max(watched, wl, fav, 1);
          return (
            <div key={String(label)} className="mb-2 flex items-center gap-2">
              <div className="w-24 truncate text-right text-xs text-muted">{label}</div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-elevated">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(Number(count) / max) * 100}%` }} />
              </div>
              <div className="w-8 text-xs tabular-nums text-subtle">{count}</div>
            </div>
          );
        })}
      </div>
      <style>{`.recharts-cartesian-axis-tick-value { fill: var(--cv-muted); font-size: 11px; }`}</style>
      {/* keep tooltipStyle referenced to avoid unused in some builds */}
      <span className="hidden">{JSON.stringify(tooltipStyle)}</span>
    </div>
  );
}

function ChartBlock({ title, data }: { title: string; data: { name: string; count: number }[] }) {
  if (!data.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="h-48 rounded-xl border border-border bg-card p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "var(--cv-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "var(--cv-elevated)",
                border: "1px solid var(--cv-border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--cv-fg)",
              }}
            />
            <Bar dataKey="count" fill="var(--cv-accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
