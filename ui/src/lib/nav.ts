// The canonical top-level navigation. One source of truth so the desktop
// header, the mobile menu drawer, and the search index never drift apart.
// (The bottom tab bar on mobile is a deliberately shorter quick-access subset.)
export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Gallery" },
  { href: "/palettes", label: "Palettes" },
  { href: "/art-styles", label: "Art Styles" },
  { href: "/studio", label: "Studio" },
  { href: "/lineage", label: "Lineage" },
  { href: "/compare", label: "Compare" },
  { href: "/model-bake-off", label: "Bake-off" },
];

/** Is `href` the active section for the current pathname? */
export function isActiveNav(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
