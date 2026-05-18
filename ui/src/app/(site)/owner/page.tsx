import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  KeyRound,
  Lock,
  Sparkles,
  Unlock,
  X,
} from "lucide-react";
import {
  acceptTasteRule,
  lockOwnerMode,
  queueTasteDistillation,
  rejectTasteRule,
  unlockOwnerMode,
} from "@/app/actions";
import { getFileUrl, listTasteRules, parseJson } from "@/lib/odata";
import type { TasteRule } from "@/lib/odata";
import { isOwner, isOwnerModeConfigured } from "@/lib/owner";
import {
  Marker,
  PageHero,
} from "@/components/page-hero";
import {
  SectionHeading,
  StickyNote,
  WashiTape,
} from "@/components/scrapbook";

const errorCopy: Record<string, string> = {
  "bad-passphrase": "That passphrase did not unlock owner mode.",
  "not-configured": "Set KATAGAMI_OWNER_SECRET on the server first.",
};

type TasteRuleDashboard = {
  proposed: TasteRule[];
  accepted: TasteRule[];
  rejected: TasteRule[];
  unavailable: boolean;
};

const emptyTasteRuleDashboard: TasteRuleDashboard = {
  proposed: [],
  accepted: [],
  rejected: [],
  unavailable: false,
};

async function loadTasteRuleDashboard(
  owner: boolean,
): Promise<TasteRuleDashboard> {
  if (!owner) return emptyTasteRuleDashboard;
  try {
    const rules = (await listTasteRules()).sort(byNewestTasteRule);
    return {
      proposed: rules.filter((rule) => tasteRuleStatus(rule) === "Proposed"),
      accepted: rules.filter((rule) => tasteRuleStatus(rule) === "Accepted"),
      rejected: rules.filter((rule) => tasteRuleStatus(rule) === "Rejected"),
      unavailable: false,
    };
  } catch {
    return { ...emptyTasteRuleDashboard, unavailable: true };
  }
}

function byNewestTasteRule(a: TasteRule, b: TasteRule): number {
  return tasteRuleTime(b) - tasteRuleTime(a);
}

function tasteRuleTime(rule: TasteRule): number {
  const raw =
    tasteRuleField(rule, "UpdatedAt", "updated_at") ||
    tasteRuleField(rule, "CreatedAt", "created_at");
  const time = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

function tasteRuleStatus(rule: TasteRule): string {
  return rule.status || rule.fields.State || rule.fields.Status || "Proposed";
}

function tasteRuleField(rule: TasteRule, ...keys: string[]): string {
  for (const key of keys) {
    const value = rule.fields[key];
    if (value?.trim()) return value;
  }
  return "";
}

function tasteRuleIds(rule: TasteRule, ...keys: string[]): string[] {
  const raw = tasteRuleField(rule, ...keys);
  const parsed = parseJson<string[]>(raw);
  if (Array.isArray(parsed)) return parsed.filter(Boolean);
  return [];
}

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    locked?: string;
    unlocked?: string;
  }>;
}) {
  const [sp, owner, configured] = await Promise.all([
    searchParams,
    isOwner(),
    Promise.resolve(isOwnerModeConfigured()),
  ]);
  const error = sp.error ? errorCopy[sp.error] : undefined;
  const tasteRules = await loadTasteRuleDashboard(owner);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:py-10">
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        back to gallery
      </Link>

      <PageHero
        eyebrow={
          <>
            <span>private controls</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">
              owner mode
            </span>
          </>
        }
        eyebrowAccent="sumire"
        title={<Marker color={owner ? "salad" : "sumire"}>Owner mode</Marker>}
        description={
          <>
            Unlock this browser to reveal curator controls in the gallery and
            language detail pages. The server still checks owner mode before it
            archives anything.
          </>
        }
        rightSlot={
          <span
            className={`stamp ${
              owner ? "text-[var(--salad)]" : "text-[var(--sumire)]"
            }`}
          >
            {owner ? "unlocked" : "locked"}
          </span>
        }
      />

      <section className="relative">
        <WashiTape
          color={owner ? "salad" : "sumire"}
          rotate={-4}
          className="-left-3 -top-3"
          width={86}
        />
        <StickyNote className="p-5 sm:p-6">
          <SectionHeading
            eyebrow={owner ? "session active" : "unlock"}
            eyebrowColor={owner ? "salad" : "sumire"}
          >
            <Marker color={owner ? "salad" : "sumire"}>
              {owner ? "archive controls are visible" : "enter passphrase"}
            </Marker>
          </SectionHeading>

          {owner ? (
            <div className="space-y-5">
              {sp.unlocked ? (
                <p className="text-sm text-muted-foreground">
                  Owner mode is active in this browser.
                </p>
              ) : null}
              <form action={lockOwnerMode}>
                <button className="inline-flex h-9 items-center gap-1.5 border border-border bg-card/70 px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/80 shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all hover:-translate-y-[2px] hover:text-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  lock owner mode
                </button>
              </form>
            </div>
          ) : (
            <form action={unlockOwnerMode} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="owner-passphrase"
                  className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  owner passphrase
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <span className="relative flex-1">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="owner-passphrase"
                      name="passphrase"
                      type="password"
                      autoComplete="current-password"
                      disabled={!configured}
                      className="h-10 w-full min-w-0 rounded-[4px] border border-border bg-background/70 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-2 focus:ring-[color-mix(in_oklch,var(--sumire)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder={
                        configured
                          ? "Only the owner knows this"
                          : "Set KATAGAMI_OWNER_SECRET first"
                      }
                    />
                  </span>
                  <button
                    disabled={!configured}
                    className="inline-flex h-10 items-center justify-center gap-1.5 border border-border bg-card/70 px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/80 shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all hover:-translate-y-[2px] hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    unlock
                  </button>
                </div>
              </div>
              {error ? (
                <p className="text-sm font-medium text-destructive">{error}</p>
              ) : null}
              {sp.locked ? (
                <p className="text-sm text-muted-foreground">
                  Owner mode is locked for this browser.
                </p>
              ) : null}
            </form>
          )}
        </StickyNote>
      </section>

      {owner ? <TasteRulesPanel dashboard={tasteRules} /> : null}
    </div>
  );
}

function TasteRulesPanel({
  dashboard,
}: {
  dashboard: TasteRuleDashboard;
}) {
  const { proposed, accepted, rejected, unavailable } = dashboard;
  return (
    <section className="relative">
      <WashiTape
        color="ramune"
        rotate={3}
        className="-right-3 -top-3"
        width={94}
      />
      <StickyNote className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeading eyebrow="learning loop" eyebrowColor="ramune">
            <Marker color="ramune">Taste rules</Marker>
          </SectionHeading>
          <form action={queueTasteDistillation}>
            <button className="inline-flex h-9 items-center gap-1.5 border border-border bg-card/70 px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/80 shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all hover:-translate-y-[2px] hover:text-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              distill archive
            </button>
          </form>
        </div>

        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Archived languages produce negative proposals. Featured languages
          produce positive proposals. Only accepted rules are read by synthesis
          and quality review.
        </p>

        {unavailable ? (
          <p className="mt-4 border border-dashed border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
            Taste rule storage is not available in this environment yet.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="grid gap-2 sm:grid-cols-3">
              <TasteRuleCount label="proposed" value={proposed.length} />
              <TasteRuleCount label="accepted" value={accepted.length} />
              <TasteRuleCount label="rejected" value={rejected.length} />
            </div>

            <TasteRuleSection
              title="Proposed"
              empty="No proposed rules are waiting."
            >
              {proposed.slice(0, 12).map((rule) => (
                <TasteRuleCard key={rule.entity_id} rule={rule} reviewable />
              ))}
            </TasteRuleSection>

            <TasteRuleSection
              title="Accepted"
              empty="No accepted rules yet."
            >
              {accepted.slice(0, 8).map((rule) => (
                <TasteRuleCard key={rule.entity_id} rule={rule} />
              ))}
            </TasteRuleSection>
          </div>
        )}
      </StickyNote>
    </section>
  );
}

function TasteRuleCount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-border bg-background/60 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function TasteRuleSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      {hasChildren ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <p className="border border-dashed border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </div>
  );
}

function TasteRuleCard({
  rule,
  reviewable = false,
}: {
  rule: TasteRule;
  reviewable?: boolean;
}) {
  const title = tasteRuleField(rule, "Title", "title") || "Untitled rule";
  const polarity = tasteRuleField(rule, "Polarity", "polarity") || "negative";
  const patternType = tasteRuleField(rule, "PatternType", "pattern_type");
  const confidence = tasteRuleField(rule, "Confidence", "confidence");
  const ruleText = tasteRuleField(rule, "RuleText", "rule_text");
  const rationale = tasteRuleField(rule, "Rationale", "rationale");
  const reportFileId = tasteRuleField(rule, "ReportFileId", "report_file_id");
  const evidenceIds = tasteRuleIds(
    rule,
    "EvidenceLanguageIds",
    "evidence_language_ids",
  );
  const comparatorIds = tasteRuleIds(
    rule,
    "ComparatorLanguageIds",
    "comparator_language_ids",
  );
  const polarityClass =
    polarity === "positive"
      ? "border-[color-mix(in_oklch,var(--salad)_50%,var(--border))] text-[var(--salad)]"
      : "border-[color-mix(in_oklch,var(--sakura)_50%,var(--border))] text-[var(--sakura)]";

  return (
    <article className="border border-border bg-background/70 p-4 shadow-[0_1px_2px_rgba(30,35,45,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`border bg-card/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${polarityClass}`}
        >
          {polarity}
        </span>
        {patternType ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {patternType}
          </span>
        ) : null}
        {confidence ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {confidence} confidence
          </span>
        ) : null}
      </div>

      <h4 className="mt-3 text-base font-semibold leading-snug">{title}</h4>
      {ruleText ? (
        <p className="mt-2 text-sm leading-6 text-foreground/85">{ruleText}</p>
      ) : null}
      {rationale ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {rationale}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        <TasteRuleLanguageLinks label="evidence" ids={evidenceIds} />
        <TasteRuleLanguageLinks label="comparators" ids={comparatorIds} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {reportFileId ? (
          <a
            href={getFileUrl(reportFileId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 border border-border bg-card/60 px-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            report
          </a>
        ) : null}

        {reviewable ? (
          <>
            <form action={acceptTasteRule.bind(null, rule.entity_id)}>
              <button className="inline-flex h-8 items-center gap-1.5 border border-[color-mix(in_oklch,var(--salad)_50%,var(--border))] bg-card/60 px-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--salad)] transition-all hover:-translate-y-[1px]">
                <Check className="h-3.5 w-3.5" />
                accept
              </button>
            </form>
            <form action={rejectTasteRule.bind(null, rule.entity_id)}>
              <button className="inline-flex h-8 items-center gap-1.5 border border-[color-mix(in_oklch,var(--sakura)_45%,var(--border))] bg-card/60 px-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--sakura)] transition-all hover:-translate-y-[1px]">
                <X className="h-3.5 w-3.5" />
                reject
              </button>
            </form>
          </>
        ) : null}
      </div>
    </article>
  );
}

function TasteRuleLanguageLinks({
  label,
  ids,
}: {
  label: string;
  ids: string[];
}) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {ids.slice(0, 8).map((id) => (
        <Link
          key={id}
          href={`/language/${id}`}
          className="border border-border bg-card/50 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {id.slice(0, 8)}
        </Link>
      ))}
      {ids.length > 8 ? (
        <span className="font-mono text-[10px] text-muted-foreground">
          +{ids.length - 8}
        </span>
      ) : null}
    </div>
  );
}
