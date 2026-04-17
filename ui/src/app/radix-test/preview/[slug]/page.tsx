"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { NeoKawaiiRadix } from "@/components/embodiments/neo-kawaii-radix";
import { KukanPressRadix } from "@/components/embodiments/kukan-press-radix";
import { NeoKawaiiTechRadix } from "@/components/embodiments/neo-kawaii-agent";
import { KukanPressGridRadix } from "@/components/embodiments/kukan-press-agent";
import { NeoKawaiiTech } from "@/components/embodiments/neo-kawaii-tech";
import { DynamicEmbodiment } from "@/components/dynamic-embodiment";

const COMPONENTS: Record<string, React.ComponentType> = {
  "neo-kawaii-manual": NeoKawaiiRadix,
  "kukan-press-manual": KukanPressRadix,
  "neo-kawaii-agent": NeoKawaiiTechRadix,
  "kukan-press-agent": KukanPressGridRadix,
  "neo-kawaii-visual-feedback": NeoKawaiiTech,
};

export default function PreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const fileId = searchParams.get("fileId");

  // Dynamic TSX preview via ?fileId= query param
  if (fileId) {
    return <DynamicEmbodiment fileId={fileId} format="tsx" />;
  }

  // Static component registry for hardcoded embodiments
  const Component = COMPONENTS[slug];

  if (!Component) {
    return <div style={{ padding: 32, fontFamily: "system-ui" }}>Unknown embodiment: {slug}</div>;
  }

  return <Component />;
}
