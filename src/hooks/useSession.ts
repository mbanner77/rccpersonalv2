"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "@/types/auth";

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/me", { credentials: "include" });
        if (!active) return;
        if (res.ok) {
          const data = (await res.json()) as SessionUser;
          setUser(data);
          setError(null);
        } else if (res.status === 401) {
          setUser(null);
          setError(null);
        } else {
          const text = (await res.text()) || res.statusText;
          setError(text);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return { user, loading, error };
}
