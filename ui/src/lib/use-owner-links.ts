"use client";

import { useEffect, useState } from "react";
import { NAV_LINKS, OWNER_NAV_LINKS, type NavLink } from "@/lib/nav";

// Owner-only nav entries appear after a client-side check against
// /api/auth/me (same pattern as the header identity chip), so the shared
// (site) layout never touches cookies() and public visitors never see the
// owner sections in the menu.
export function useNavLinks(): NavLink[] {
  const [links, setLinks] = useState<NavLink[]>(NAV_LINKS);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.owner) setLinks([...NAV_LINKS, ...OWNER_NAV_LINKS]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return links;
}
