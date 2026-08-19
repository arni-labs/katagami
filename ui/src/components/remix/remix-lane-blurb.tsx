import { LANGUAGE_REMIX_LANE_AFTER_NAME } from "@/lib/remix-lane-copy";

/** Remix-lane blurb on a language detail page. Spaces around {name} are explicit. */
export function RemixLaneBlurb({ name }: { name: string }) {
  return (
    <p className="mb-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
      Keep{" "}
      <span className="text-foreground">{name}</span>
      {" "}
      {LANGUAGE_REMIX_LANE_AFTER_NAME}
    </p>
  );
}
