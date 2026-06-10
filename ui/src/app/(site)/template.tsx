/** Remounts on every route change, giving each page a soft slide-on —
 *  the new sheet landing on the press bed. Reduced motion disables it
 *  in CSS. */
export default function SiteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-enter">{children}</div>;
}
