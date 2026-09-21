import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clapperboard, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRuntime } from "@/lib/utils";
import type { LibEntry, Movie } from "@/lib/cineverse/types";
import { libFor } from "@/lib/cineverse/store";

export function Btn({
  variant = "ghost",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "ok" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-40",
        size === "sm" && "h-9 rounded-full px-3 text-sm",
        size === "md" && "h-11 rounded-full px-4 text-sm",
        size === "lg" && "h-12 rounded-full px-5 text-base",
        size === "icon" && "size-11 rounded-full",
        variant === "primary" && "bg-accent text-accent-fg hover:opacity-90",
        variant === "secondary" && "bg-elevated text-fg hover:bg-card",
        variant === "ghost" && "bg-card text-fg hover:bg-elevated",
        variant === "danger" && "bg-accent/15 text-accent",
        variant === "ok" && "bg-ok/15 text-ok",
        variant === "outline" && "border border-border bg-transparent text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors duration-150",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-card text-muted hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="text-muted">{icon || <Clapperboard className="size-9" strokeWidth={1.5} />}</div>
      <p className="text-base font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

export function PosterImg({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed || !src) {
    return (
      <div className={cn("grid place-items-center bg-elevated text-subtle", className)}>
        <Clapperboard className="size-8" strokeWidth={1.25} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}

export function MovieCard({
  movie,
  lib,
  onOpen,
  compact = false,
}: {
  movie: Movie;
  lib?: LibEntry;
  onOpen: (id: string) => void;
  compact?: boolean;
}) {
  const year = movie.year || (movie.releaseDate || "").slice(0, 4);
  return (
    <button
      type="button"
      onClick={() => onOpen(movie.id)}
      className={compact ? "group w-[124px] shrink-0 snap-start text-left sm:w-[140px]" : "group w-full text-left"}
      aria-label={movie.title}
    >
      <div className="poster-shine relative aspect-[2/3] overflow-hidden rounded-md bg-elevated ring-1 ring-border transition-transform duration-200 group-hover:-translate-y-1 group-hover:ring-accent/40">
        <PosterImg src={movie.poster} alt="" className="h-full w-full" />
        {movie.isFree ? (
          <span className="absolute top-2 left-2 rounded-md bg-ok px-1.5 py-0.5 text-xs font-semibold tracking-wide text-accent-fg">
            FREE
          </span>
        ) : null}
        {lib?.watched ? (
          <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-ok text-xs font-bold text-accent-fg">
            ✓
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 hidden p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
          <div className="flex items-center gap-1 text-xs font-medium text-fg drop-shadow">
            {movie.rating ? (
              <>
                <Star className="size-3 fill-current" /> {movie.rating}
              </>
            ) : null}
            {movie.runtime ? <span className="text-fg/70">· {formatRuntime(movie.runtime)}</span> : null}
          </div>
        </div>
      </div>
      <div className="mt-2 line-clamp-2 text-[13px] leading-snug font-medium text-fg">{movie.title}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle">
        {year ? <span>{year}</span> : null}
        {movie.rating ? (
          <span className="inline-flex items-center gap-0.5">
            <Star className="size-2.5" /> {movie.rating}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function MovieGrid({
  movies,
  library,
  onOpen,
}: {
  movies: Movie[];
  library: LibEntry[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {movies.map((m) => (
        <div key={m.id} className="min-w-0">
          <MovieCard movie={m} lib={libFor(m.id, library)} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
}

export function Carousel({
  title,
  seeAll,
  onSeeAll,
  movies,
  library,
  onOpen,
  empty,
  reason,
}: {
  title: string;
  seeAll?: string;
  onSeeAll?: () => void;
  movies: Movie[];
  library: LibEntry[];
  onOpen: (id: string) => void;
  empty?: ReactNode;
  reason?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  if (!movies.length) return empty ? <>{empty}</> : null;
  const scrollBy = (dir: number) => {
    scroller.current?.scrollBy({ left: dir * 420, behavior: "smooth" });
  };
  return (
    <section className="relative">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-fg md:text-xl">{title}</h2>
          {reason ? <p className="mt-0.5 text-xs text-muted">{reason}</p> : null}
        </div>
        <div className="flex items-center gap-1">
          {onSeeAll && seeAll ? (
            <button type="button" onClick={onSeeAll} className="mr-1 text-sm text-accent hover:underline">
              {seeAll}
            </button>
          ) : null}
          <button
            type="button"
            className="hidden size-9 place-items-center rounded-full border border-border bg-surface text-fg md:grid"
            onClick={() => scrollBy(-1)}
            aria-label="Previous"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="hidden size-9 place-items-center rounded-full border border-border bg-surface text-fg md:grid"
            onClick={() => scrollBy(1)}
            aria-label="Next"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="hide-scroll flex gap-3 overflow-x-auto pb-2"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {movies.map((m) => (
          <MovieCard key={m.id} movie={m} lib={libFor(m.id, library)} onOpen={onOpen} compact />
        ))}
      </div>
    </section>
  );
}

export function SkeletonRow({ n = 8 }: { n?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="w-[124px] shrink-0 sm:w-[140px]">
          <div className="skel aspect-[2/3] rounded-md" />
          <div className="skel mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function StatCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className={cn("font-display text-3xl tabular-nums", color)}>{value}</div>
      <div className="mt-1 text-[11px] tracking-wide text-subtle uppercase">{label}</div>
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {label ? (
        <div className="mb-2 flex justify-between text-sm text-muted">
          <span>{label}</span>
          <span className="tabular-nums text-fg">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-elevated">
        <div className="progress-fill h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-md border border-border bg-elevated px-3.5 text-sm text-fg outline-none placeholder:text-subtle focus:border-accent",
        props.className,
      )}
    />
  );
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-11 rounded-full border border-border bg-card px-3.5 text-sm text-fg outline-none",
        props.className,
      )}
    />
  );
}

export function useKey(key: string, handler: (e: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === key) ref.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, enabled]);
}

export function statusLabel(status: string, t: { statusFree: string; statusSub: string; statusRent: string; statusBuy: string; statusAds: string }) {
  if (status === "free") return t.statusFree;
  if (status === "subscription") return t.statusSub;
  if (status === "rent") return t.statusRent;
  if (status === "buy") return t.statusBuy;
  if (status === "ads") return t.statusAds;
  return status;
}

export function statusClass(status: string) {
  if (status === "free" || status === "ads") return "text-ok";
  if (status === "subscription") return "text-info";
  if (status === "rent") return "text-warn";
  return "text-accent";
}
