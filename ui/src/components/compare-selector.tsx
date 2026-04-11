"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CompareSelector({
  languages,
  initialA,
  initialB,
}: {
  languages: { id: string; name: string }[];
  initialA?: string;
  initialB?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [a, setA] = useState(initialA ?? "");
  const [b, setB] = useState(initialB ?? "");

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/compare?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-4">
      <Select
        value={a}
        onValueChange={(v) => {
          setA(v);
          update("a", v);
        }}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select first language..." />
        </SelectTrigger>
        <SelectContent>
          {languages.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-sm">vs</span>
      <Select
        value={b}
        onValueChange={(v) => {
          setB(v);
          update("b", v);
        }}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select second language..." />
        </SelectTrigger>
        <SelectContent>
          {languages.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
