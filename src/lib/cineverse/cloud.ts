import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { BackupV3 } from "./types";

function asPayload(raw: unknown): BackupV3 | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as BackupV3;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as BackupV3;
  return null;
}

export const pullCloud = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ payload: unknown; updated_at: string }>`
      select payload, updated_at from cineverse_cloud where user_id = ${context.userId} limit 1
    `;
    const row = rows[0];
    if (!row) return { payload: null as BackupV3 | null, updatedAt: null as string | null };
    return { payload: asPayload(row.payload), updatedAt: row.updated_at };
  });

export const pushCloud = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: BackupV3) => raw)
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const payload = JSON.stringify({
      version: 3,
      exportedAt: new Date().toISOString(),
      library: Array.isArray(data.library) ? data.library : [],
      tracker: Array.isArray(data.tracker) ? data.tracker : [],
      searchHistory: Array.isArray(data.searchHistory) ? data.searchHistory : [],
      recentViewed: Array.isArray(data.recentViewed) ? data.recentViewed : [],
      settings: data.settings && typeof data.settings === "object" ? data.settings : {},
      reminders: Array.isArray(data.reminders) ? data.reminders : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
      favActors: Array.isArray(data.favActors) ? data.favActors : [],
      manualTv: data.manualTv ?? null,
    } satisfies BackupV3);
    await sql.query(
      `insert into cineverse_cloud (user_id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (user_id) do update set payload = excluded.payload, updated_at = now()`,
      [context.userId, payload],
    );
    return { ok: true as const, updatedAt: new Date().toISOString() };
  });
