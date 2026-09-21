import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveToCloud, syncFromCloud } from "@/lib/cineverse/sync-cloud";
import { useApp } from "@/lib/cineverse/store";

export function CloudSync() {
  const { user, isPending } = useCurrentUserState();
  const cloudTick = useApp((s) => s.cloudTick);
  const showToast = useApp((s) => s.showToast);
  const t = useApp((s) => s.dict);
  const syncedFor = useRef<string | null>(null);
  const pushing = useRef(false);
  const lastTick = useRef(0);

  useEffect(() => {
    if (isPending || !user) {
      if (!isPending && !user) syncedFor.current = null;
      return;
    }
    if (syncedFor.current === user.id) return;
    let cancelled = false;
    (async () => {
      const result = await syncFromCloud();
      if (cancelled) return;
      syncedFor.current = user.id;
      if (result === "merged") showToast(t.cloudSynced);
      else if (result === "empty") showToast(t.cloudUploaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isPending, showToast, t.cloudSynced, t.cloudUploaded]);

  useEffect(() => {
    if (!user || isPending) return;
    if (cloudTick === lastTick.current) return;
    lastTick.current = cloudTick;
    const id = window.setTimeout(async () => {
      if (pushing.current) return;
      pushing.current = true;
      await saveToCloud();
      pushing.current = false;
    }, 1600);
    return () => window.clearTimeout(id);
  }, [cloudTick, user, isPending]);

  return null;
}
