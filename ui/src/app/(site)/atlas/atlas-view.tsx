"use client";

import { useEffect, useState } from "react";
import type { AtlasHole, AtlasStyle } from "@/lib/catalog";
import { AtlasMap } from "./atlas-map";
import { PhoneAtlas } from "./family-feed";

type Family = { id: string; label: string; lead: string; count: number; x: number; y: number };

export function AtlasView(props: { styles: AtlasStyle[]; families: Family[]; holes: AtlasHole[]; unplaced: number; sample: boolean }) {
  // Unknown until the browser says, so neither layout is built for the wrong screen.
  const [phone, setPhone] = useState<boolean | null>(null);
  useEffect(() => {
    const read = () => setPhone(window.innerWidth < 768);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  if (phone === null) return <div className="h-[calc(100dvh-var(--site-header))] w-full" aria-busy="true" />;
  return phone ? <PhoneAtlas styles={props.styles} families={props.families} holes={props.holes} sample={props.sample} /> : <AtlasMap {...props} />;
}
