// The canonical top-level navigation. One source of truth so the desktop
// header, the mobile menu drawer, and the search index never drift apart.
// (The bottom tab bar on mobile is a deliberately shorter quick-access subset.)
export interface NavLink {
  href: string;
  label: string;
  /** True for owner-only sections — rendered with a distinct accent so the
   *  owner can tell at a glance which entries the public never sees. */
  owner?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Gallery" },
  { href: "/palettes", label: "Palettes" },
  { href: "/art-styles", label: "Art Styles" },
  { href: "/studio", label: "Studio" },
  { href: "/model-bake-off", label: "Bake-off" },
  { href: "/connect", label: "MCP" },
  // Lineage + Compare are hidden from the menu for now (routes still work via
  // direct URL); re-add here when they're ready to surface again.
];

// Owner-only sections: appended to the header/mobile nav after the
// client-side owner check (from /api/auth/me). Deliberately NOT in NAV_LINKS
// so the public menu and the search index never advertise them.
export const OWNER_NAV_LINKS: NavLink[] = [
  { href: "/owner", label: "Owner", owner: true },
  { href: "/owner/visitor-shelf", label: "Visitor home", owner: true },
  { href: "/voice", label: "Writing Styles", owner: true },
  { href: "/under-review", label: "Under Review", owner: true },
];

/** Is `href` the active section for the current pathname? */
export function isActiveNav(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
