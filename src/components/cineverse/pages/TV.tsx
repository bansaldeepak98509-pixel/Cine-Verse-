import { useEffect, useMemo, useState } from "react";
import { Radio, Tv } from "lucide-react";
import { safeHttpUrl } from "@/lib/utils";
import { DEMO_TV } from "@/lib/cineverse/demo";
import { useApp } from "@/lib/cineverse/store";
import type { TvProgram } from "@/lib/cineverse/types";
import { Btn, Chip, EmptyState } from "../widgets";

function tvNowParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date());
  const o: Record<string, string> = {};
  parts.forEach((x) => (o[x.type] = x.value));
  return o;
}
function tvTimeToMin(t: string) {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + (m || 0);
}
function tvCurrentMin() {
  const p = tvNowParts();
  return Number(p.hour) * 60 + Number(p.minute) + Number(p.second) / 60;
}
function tvStatus(item: TvProgram) {
  let s = tvTimeToMin(item.start);
  let e = tvTimeToMin(item.end || item.start);
  let n = tvCurrentMin();
  if (e <= s) e += 1440;
  if (n < s) n += 1440;
  if (n >= s && n < e)
    return { live: true, remain: Math.max(0, Math.floor((e - n) * 60)), elapsed: Math.max(0, Math.floor((n - s) * 60)), total: Math.max(1, Math.floor((e - s) * 60)) };
  return { live: false, remain: n < s ? Math.floor((s - n) * 60) : 0, elapsed: 0, total: Math.max(1, Math.floor((e - s) * 60)) };
}
function tvCountdown(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TVPage() {
  const { manualTv, settings, dict: t } = useApp();
  const [schedule, setSchedule] = useState<TvProgram[]>([]);
  const [source, setSource] = useState("Demo");
  const [ch, setCh] = useState("all");
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (manualTv && manualTv.length) {
        if (!cancelled) {
          setSchedule(manualTv);
          setSource(`${t.manualLabel} (${manualTv.length})`);
        }
        return;
      }
      if (settings.tvUrl) {
        try {
          const r = await fetch(settings.tvUrl);
          const data = await r.json();
          if (Array.isArray(data) && data.length && !cancelled) {
            setSchedule(
              data.map((x: Record<string, string>) => ({
                channel: x.channel || "Channel",
                movieTitle: x.movieTitle || x.name || "Program",
                start: x.start || "00:00",
                end: x.end || "",
                url: x.url || "",
                scheduleUrl: x.scheduleUrl || "",
              })),
            );
            setSource(t.customApi);
            return;
          }
        } catch {
          /* fallback */
        }
      }
      if (!cancelled) {
        setSchedule(DEMO_TV);
        setSource(t.indiaGuide);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manualTv, settings.tvUrl, t.customApi, t.indiaGuide, t.manualLabel]);

  const isGuide = schedule.every((x) => x.scheduleUrl || (x.movieTitle || "").toLowerCase().includes("schedule"));
  const filtered = ch === "all" ? schedule : schedule.filter((x) => x.channel === ch);
  const live = filtered.filter((x) => tvStatus(x).live);
  const upcoming = filtered.filter((x) => {
    const st = tvStatus(x);
    return !st.live && st.remain > 0;
  });
  const rest = filtered.filter((x) => {
    const st = tvStatus(x);
    return !st.live && !(st.remain > 0);
  });
  const channels = useMemo(() => [...new Set(schedule.map((s) => s.channel))], [schedule]);

  return (
    <div className="anim-enter pb-8">
      <h1 className="font-display text-3xl">{t.liveTv}</h1>
      <p className="mt-1 mb-4 text-sm text-muted">{t.tvDemoNote}</p>

      {isGuide && !manualTv?.length ? (
        <>
          <div className="mb-4 rounded-xl border border-accent/40 bg-card p-4">
            <div className="flex items-center gap-3">
              <Radio className="size-5 text-accent" />
              <div>
                <strong>Live Indian TV Schedule</strong>
                <div className="text-sm text-muted">EPGSchedule + TVGenie — external guides, not a live feed</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn size="sm" variant="primary" onClick={() => window.open("https://www.epgschedule.com/channel/sony-max/", "_blank")}>
                EPGSchedule
              </Btn>
              <Btn size="sm" variant="outline" onClick={() => window.open("https://tvgenie.in", "_blank")}>
                TVGenie
              </Btn>
            </div>
          </div>
          {schedule.map((x) => {
            const href = safeHttpUrl(x.scheduleUrl || x.url || "");
            return (
              <button
                key={x.channel}
                type="button"
                className="mb-2 flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left"
                onClick={() => href && window.open(href, "_blank")}
              >
                <Tv className="size-5 text-muted" />
                <div className="flex-1">
                  <strong>{x.channel}</strong>
                  <div className="text-xs text-muted">Today's schedule</div>
                </div>
                <span className="text-sm text-accent">{t.open}</span>
              </button>
            );
          })}
        </>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip active={ch === "all"} onClick={() => setCh("all")}>{t.all}</Chip>
            {channels.map((c) => (
              <Chip key={c} active={ch === c} onClick={() => setCh(c)}>{c}</Chip>
            ))}
          </div>
          <h2 className="mb-2 text-base font-semibold">{t.nowPlaying}</h2>
          {live.length ? live.map((x) => <TvCard key={x.channel + x.start} x={x} />) : <EmptyState icon={<Tv className="size-8" />} title={`${t.noLiveNow} (${source})`} />}
          {upcoming.length ? (
            <>
              <h2 className="mt-5 mb-2 text-base font-semibold">{t.upcoming} ({upcoming.length})</h2>
              {upcoming.map((x) => <TvCard key={x.channel + x.start} x={x} />)}
            </>
          ) : null}
          {rest.length ? (
            <>
              <h2 className="mt-5 mb-2 text-base font-semibold">{t.ended}</h2>
              {rest.slice(0, 20).map((x) => <TvCard key={x.channel + x.start} x={x} />)}
            </>
          ) : null}
        </>
      )}
      <p className="mt-4 text-xs text-subtle">
        {t.source}: {source}
      </p>
    </div>
  );
}

function TvCard({ x }: { x: TvProgram }) {
  const { dict: t } = useApp();
  const st = tvStatus(x);
  const pct = st.live ? Math.min(100, (st.elapsed / st.total) * 100) : 0;
  const statusTxt = st.live ? t.live : st.remain > 0 ? `${t.startsIn} ${tvCountdown(st.remain)}` : t.ended;
  const hrefS = safeHttpUrl(x.scheduleUrl || "");
  const hrefU = safeHttpUrl(x.url || "");
  return (
    <div className={`mb-2 rounded-lg border bg-card p-3 ${st.live ? "border-accent" : "border-border"}`}>
      <div className="flex items-center gap-3">
        <Tv className="size-5 text-muted" />
        <div className="min-w-0 flex-1">
          <strong>{x.movieTitle}</strong>
          <div className="text-xs text-muted">
            {x.channel} · {x.start}
            {x.end ? `–${x.end}` : ""}
          </div>
        </div>
        <span className={`text-xs ${st.live ? "text-accent" : "text-muted"}`}>{statusTxt}</span>
      </div>
      {st.live ? (
        <>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-elevated">
            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-subtle">
            <span>{x.start}</span>
            <span>{tvCountdown(st.remain)} {t.remaining}</span>
            <span>{x.end}</span>
          </div>
        </>
      ) : null}
      <div className="mt-2 flex gap-2">
        {hrefS ? (
          <Btn size="sm" variant="primary" onClick={() => window.open(hrefS, "_blank")}>
            {t.openSchedule}
          </Btn>
        ) : null}
        {hrefU ? (
          <Btn size="sm" variant="outline" onClick={() => window.open(hrefU, "_blank")}>
            {t.openOtt}
          </Btn>
        ) : null}
      </div>
    </div>
  );
}
