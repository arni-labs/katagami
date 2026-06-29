import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { AB_ITEMS } from "./ab-data";
import { AbReview } from "./ab-review";

// Owner-only. Unlisted on purpose — not added to header-nav, mobile-nav, or the
// search index. Reachable only by URL, exactly like /lab. A non-owner request
// 404s (the route reveals nothing about its existence).
export const dynamic = "force-dynamic";

export default async function AbReviewPage() {
  if (!(await isOwner())) notFound();
  return <AbReview items={AB_ITEMS} />;
}
