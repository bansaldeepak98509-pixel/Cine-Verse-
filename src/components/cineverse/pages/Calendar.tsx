import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useApp } from "@/lib/cineverse/store";
import { Btn, Chip, EmptyState } from "../widgets";

export function CalendarPage() {
  const { library, catalog, dict: t, addReminder, showToast, openMovie } = useApp();
  const [view, setView] = useState<"list" | "month">("list");
  const today = new Date().toISOString().slice(0, 10);
  const items = useMemo(() => {
    const out: { date: string; label: string; id?: string }[] = [];
    library.filter((m) => m.watchedDate).forEach((m) => out.push({ date: m.watchedDate as string, label: `${m.title || ""}`, id: m.id }));
    library.filter((m) => m.addedAt).forEach((m) => {
      const d = new Date(m.addedAt as number).toISOString().slice(0, 10);
      out.push({ date: d, label: `${m.title || ""}`, id: m.id });
    });
    catalog
      .filter((m) => m.releaseDate && m.releaseDate >= today)
      .slice(0, 20)
      .forEach((m) => out.push({ date: m.releaseDate as string, label: m.title, id: m.id }));
    out.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }, [library, catalog, today]);

  const upcoming = catalog
    .filter((m) => m.releaseDate && m.releaseDate >= today)
    .sort((a, b) => String(a.releaseDate).localeCompare(String(b.releaseDate || "")))
    .slice(0, 12);

  const byDate: Record<string, typeof items> = {};
  items.forEach((i) => {
    (byDate[i.date] = byDate[i.date] || []).push(i);
  });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, 40);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const startDow = monthStart.getDay();

  async function notify(title: string, date: string, id: string) {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        showToast("Notifications blocked");
        return;
      }
    }
    addReminder({ id, title, date, createdAt: Date.now() });
    showToast(t.notified);
  }

  return (
    <div className="anim-enter pb-8">
      <h1 className="font-display mb-3 text-3xl">{t.calendar}</h1>
      <div className="mb-4 flex gap-2">
        <Chip active={view === "list"} onClick={() => setView("list")}>{t.viewList}</Chip>
        <Chip active={view === "month"} onClick={() => setView("month")}>{t.viewMonth}</Chip>
      </div>

      {upcoming.length ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">{t.releaseCountdown}</h2>
          <div className="space-y-2">
            {upcoming.map((m) => {
              const days = Math.max(0, Math.ceil((new Date(m.releaseDate as string).getTime() - Date.now()) / 86400000));
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openMovie(m.id)}>
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-muted">
                      {m.releaseDate} · {days} {t.daysAway}
                    </div>
                  </button>
                  <Btn size="sm" variant="outline" onClick={() => notify(m.title, m.releaseDate as string, m.id)} aria-label={t.notifyMe}>
                    <Bell className="size-4" />
                  </Btn>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {!items.length ? (
        <EmptyState title={t.noEvents} />
      ) : view === "list" ? (
        dates.map((d) => (
          <div key={d} className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-accent">{d}</h4>
            {byDate[d].map((i, idx) => (
              <button
                key={idx}
                type="button"
                className="mb-1 w-full rounded-md border border-border bg-card px-3 py-2 text-left text-sm"
                onClick={() => i.id && openMovie(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
        ))
      ) : (
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="py-2 text-subtle">
              {d}
            </div>
          ))}
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const has = byDate[iso];
            const isToday = iso === today;
            return (
              <div key={iso} className={`min-h-14 rounded-md border p-1 ${has ? "border-accent/40 bg-card" : "border-transparent"} ${isToday ? "ring-1 ring-accent" : ""}`}>
                <div className="tabular-nums text-muted">{day}</div>
                {has ? <div className="mt-1 line-clamp-2 text-[10px] text-fg">{has[0].label}</div> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
