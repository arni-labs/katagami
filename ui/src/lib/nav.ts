// The canonical top-level navigation. One source of truth so the desktop
// header, the mobile menu drawer, and the search index never drift apart.
export interface NavLink {
  href: string;
  label: string;
  /** True for owner-only sections — rendered with a distinct accent so the
   *  owner can tell at a glance which entries the public never sees. */
  owner?: boolean;
}

// Three doors, and the sheet at "/" is the library itself — the old index
// pages (Ask, Atlas, Palettes, Art Styles, Studio, the card gallery) are each
// a partial view of what the sheet already shows, so they redirect to it
// instead of competing with it. Their code is still in the tree; see the
// retired-route list in next.config.ts.
export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Gallery" },
  { href: "/model-bake-off", label: "Bake-off" },
  { href: "/connect", label: "MCP" },
];

// Owner-only sections: appended to the header/mobile nav after the
// client-side owner check (from /api/auth/me). Deliberately NOT in NAV_LINKS
// so the public menu and the search index never advertise them.
export const OWNER_NAV_LINKS: NavLink[] = [
  { href: "/owner", label: "Owner", owner: true },
  { href: "/owner/visitor-shelf", label: "Visitor home", owner: true },
  { href: "/encyclopedia", label: "Encyclopedia", owner: true },
  { href: "/writing", label: "Writing", owner: true },
  { href: "/structure", label: "Structures", owner: true },
  // The voice lane still works and keeps its own intake, so it keeps its way
  // in; the new Writing page sits beside it rather than replacing its link.
  { href: "/voice", label: "Voice", owner: true },
  { href: "/under-review", label: "Under Review", owner: true },
];

/** Is `href` the active section for the current pathname? */
export function isActiveNav(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
