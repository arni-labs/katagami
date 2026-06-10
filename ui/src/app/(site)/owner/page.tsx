import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileText,
  GitMerge,
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
import {
  getFileUrl,
  listCurationJobs,
  listTasteRules,
  parseJson,
} from "@/lib/odata";
import type { CurationJob, TasteRule } from "@/lib/odata";
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
  audits: TasteDistillationAudit[];
  unavailable: boolean;
};

type TasteDistillationAudit = {
  jobId: string;
  status: string;
  updatedAt: string;
  reportFileId: string;
  duplicates: TasteRuleAuditCandidate[];
  contradictions: TasteRuleAuditCandidate[];
  tensions: TasteRuleAuditCandidate[];
  skippedContradictions: TasteRuleAuditCandidate[];
};

type TasteRuleAuditCandidate = {
  key: string;
  text: string;
  detail: string;
  recommendation: string;
  ruleIds: string[];
};

const emptyTasteRuleDashboard: TasteRuleDashboard = {
  proposed: [],
  accepted: [],
  rejected: [],
  audits: [],
  unavailable: false,
};

async function loadTasteRuleDashboard(
  owner: boolean,
): Promise<TasteRuleDashboard> {
  if (!owner) return emptyTasteRuleDashboard;
  try {
    const rules = (await listTasteRules()).sort(byNewestTasteRule);
    let audits: TasteDistillationAudit[] = [];
    try {
      const jobs = await listCurationJobs("JobType eq 'taste_distillation'", 20);
      audits = jobs
        .filter((job) => curationJobType(job) === "taste_distillation")
        .sort(byNewestCurationJob)
        .map(tasteDistillationAuditFromJob)
        .filter(hasTasteAuditSignal)
        .slice(0, 3);
    } catch {
      audits = [];
    }
    return {
      proposed: rules.filter((rule) => tasteRuleStatus(rule) === "Proposed"),
      accepted: rules.filter((rule) => tasteRuleStatus(rule) === "Accepted"),
      rejected: rules.filter((rule) => tasteRuleStatus(rule) === "Rejected"),
      audits,
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

function byNewestCurationJob(a: CurationJob, b: CurationJob): number {
  return curationJobTime(b) - curationJobTime(a);
}

function curationJobTime(job: CurationJob): number {
  const raw =
    curationJobField(job, "UpdatedAt", "updated_at") ||
    curationJobField(job, "CreatedAt", "created_at");
  const time = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

function curationJobType(job: CurationJob): string {
  return curationJobField(job, "JobType", "job_type");
}

function curationJobField(job: CurationJob, ...keys: string[]): string {
  for (const key of keys) {
    const value = job.fields[key];
    if (value?.trim()) return value;
  }
  return "";
}

function tasteDistillationAuditFromJob(
  job: CurationJob,
): TasteDistillationAudit {
  const output = parseJson<Record<string, unknown>>(
    curationJobField(job, "Output", "output"),
  );
  return {
    jobId: job.entity_id,
    status: job.status || curationJobField(job, "State", "Status"),
    updatedAt:
      curationJobField(job, "UpdatedAt", "updated_at") ||
      curationJobField(job, "CreatedAt", "created_at"),
    reportFileId: curationJobField(job, "ReportFileId", "report_file_id"),
    duplicates: auditCandidateList(output?.duplicate_rule_candidates),
    contradictions: auditCandidateList(output?.contradiction_rule_candidates),
    tensions: auditCandidateList(output?.rule_tension_candidates),
    skippedContradictions: auditCandidateList(
      output?.skipped_contradictory_directives,
    ),
  };
}

function hasTasteAuditSignal(audit: TasteDistillationAudit): boolean {
  return (
    audit.duplicates.length > 0 ||
    audit.contradictions.length > 0 ||
    audit.tensions.length > 0 ||
    audit.skippedContradictions.length > 0
  );
}

function auditCandidateList(value: unknown): TasteRuleAuditCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.map((candidate, index) => auditCandidate(candidate, index));
}

function auditCandidate(
  candidate: unknown,
  index: number,
): TasteRuleAuditCandidate {
  if (typeof candidate === "string") {
    return {
      key: `${index}-${candidate}`,
      text: candidate,
      detail: "",
      recommendation: "",
      ruleIds: [],
    };
  }

  if (!candidate || typeof candidate !== "object") {
    return {
      key: `unknown-${index}`,
      text: "Unlabeled audit candidate",
      detail: "",
      recommendation: "",
      ruleIds: [],
    };
  }

  const record = candidate as Record<string, unknown>;
  const text =
    firstString(record, [
      "summary",
      "title",
      "rule_text",
      "ruleText",
      "description",
      "issue",
      "reason",
    ]) || "Unlabeled audit candidate";
  const detail = firstString(record, [
    "detail",
    "rationale",
    "explanation",
    "notes",
  ]);
  const recommendation = firstString(record, [
    "recommendation",
    "resolution",
    "action",
  ]);
  const ruleIds = [
    ...stringList(record.rule_ids),
    ...stringList(record.ruleIds),
    ...stringList(record.taste_rule_ids),
    ...stringList(record.existing_rule_ids),
    ...stringList(record.candidate_rule_ids),
  ];

  return {
    key: `${index}-${text}`,
    text,
    detail,
    recommendation,
    ruleIds: Array.from(new Set(ruleIds)),
  };
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const value of Object.values(record)) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = parseJson<string[]>(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
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
                <button className="inline-flex h-9 items-center gap-1.5 bg-[color-mix(in_srgb,var(--sumire)_14%,var(--paper-stamp-mix))] px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[color-mix(in_oklch,var(--sumire)_72%,var(--foreground))] shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all hover:-translate-y-[2px] hover:text-foreground">
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
                      className="h-10 w-full min-w-0 border-0 border-b-2 border-foreground/15 bg-background/70 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-[var(--sumire)] disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder={
                        configured
                          ? "Only the owner knows this"
                          : "Set KATAGAMI_OWNER_SECRET first"
                      }
                    />
                  </span>
                  <button
                    disabled={!configured}
                    className="inline-flex h-10 items-center justify-center gap-1.5 bg-[color-mix(in_srgb,var(--sumire)_14%,var(--paper-stamp-mix))] px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[color-mix(in_oklch,var(--sumire)_72%,var(--foreground))] shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all hover:-translate-y-[2px] hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
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
  const { proposed, accepted, rejected, audits, unavailable } = dashboard;
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
            <button className="inline-flex h-9 items-center gap-1.5 bg-[color-mix(in_srgb,var(--ramune)_14%,var(--paper-stamp-mix))] px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[color-mix(in_oklch,var(--ramune)_72%,var(--foreground))] shadow-[0_1px_2px_rgba(30,35,45,0.05)] transition-all hover:-translate-y-[2px] hover:text-foreground">
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
          <p
            className="mt-4 bg-background/60 px-3 py-2 text-sm text-muted-foreground"
            style={{
              boxShadow:
                "0 1px 2px rgba(33,33,60,0.04), 3px 4px 0 color-mix(in srgb, var(--ramune) 20%, transparent)",
            }}
          >
            Taste rule storage is not available in this environment yet.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="grid gap-2 sm:grid-cols-3">
              <TasteRuleCount label="proposed" value={proposed.length} />
              <TasteRuleCount label="accepted" value={accepted.length} />
              <TasteRuleCount label="rejected" value={rejected.length} />
            </div>

            <TasteRuleAuditPanel audits={audits} />

            <TasteRuleSection
              title="Proposed"
              empty="No proposed rules are waiting."
            >
              {proposed.map((rule) => (
                <TasteRuleCard key={rule.entity_id} rule={rule} reviewable />
              ))}
            </TasteRuleSection>

            <TasteRuleSection
              title="Accepted active rules"
              empty="No accepted rules yet."
            >
              {accepted.map((rule) => (
                <TasteRuleLine key={rule.entity_id} rule={rule} rejectable />
              ))}
            </TasteRuleSection>

            <TasteRuleSection
              title="Rejected history"
              empty="No rejected rules yet."
            >
              {rejected.map((rule) => (
                <TasteRuleLine key={rule.entity_id} rule={rule} />
              ))}
            </TasteRuleSection>
          </div>
        )}
      </StickyNote>
    </section>
  );
}

function TasteRuleAuditPanel({
  audits,
}: {
  audits: TasteDistillationAudit[];
}) {
  return (
    <div
      className="space-y-3 bg-background/55 p-3"
      style={{
        boxShadow:
          "0 1px 2px rgba(33,33,60,0.04), 3px 4px 0 color-mix(in srgb, var(--ramune) 20%, transparent)",
      }}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Rule hygiene reviews
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          latest distillation output
        </span>
      </div>

      {audits.length > 0 ? (
        <div className="space-y-3">
          {audits.map((audit) => (
            <TasteRuleAuditCard key={audit.jobId} audit={audit} />
          ))}
        </div>
      ) : (
        <p className="bg-card/50 px-3 py-2 text-sm text-muted-foreground">
          Future distillation runs will show duplicate, contradiction, and
          tension candidates here for owner review.
        </p>
      )}
    </div>
  );
}

function TasteRuleAuditCard({
  audit,
}: {
  audit: TasteDistillationAudit;
}) {
  const updatedAt = audit.updatedAt ? new Date(audit.updatedAt) : null;
  const timestamp =
    updatedAt && Number.isFinite(updatedAt.getTime())
      ? updatedAt.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "recent run";

  return (
    <article
      className="bg-card/60 p-3"
      style={{
        boxShadow:
          "0 1px 2px rgba(33,33,60,0.04), 3px 4px 0 color-mix(in srgb, var(--ramune) 20%, transparent)",
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {compactSourceId(audit.jobId)}
          </span>
          <TasteRuleStatusTag status={audit.status || "Completed"} />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {timestamp}
          </span>
        </div>
        {audit.reportFileId ? (
          <a
            href={getFileUrl(audit.reportFileId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 bg-[color-mix(in_srgb,var(--teal)_14%,var(--paper-stamp-mix))] px-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[color-mix(in_oklch,var(--teal)_72%,var(--foreground))] transition-colors hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            report
          </a>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2">
        <AuditCandidateGroup
          title="duplicates"
          tone="ramune"
          icon={<GitMerge className="h-3.5 w-3.5" />}
          candidates={audit.duplicates}
        />
        <AuditCandidateGroup
          title="contradictions"
          tone="sakura"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          candidates={audit.contradictions}
        />
        <AuditCandidateGroup
          title="tensions"
          tone="sumire"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          candidates={audit.tensions}
        />
        <AuditCandidateGroup
          title="skipped contradictory drafts"
          tone="sakura"
          icon={<X className="h-3.5 w-3.5" />}
          candidates={audit.skippedContradictions}
        />
      </div>
    </article>
  );
}

function AuditCandidateGroup({
  title,
  tone,
  icon,
  candidates,
}: {
  title: string;
  tone: "ramune" | "sakura" | "sumire";
  icon: ReactNode;
  candidates: TasteRuleAuditCandidate[];
}) {
  if (candidates.length === 0) return null;
  const toneClass =
    tone === "sakura"
      ? "bg-[color-mix(in_srgb,var(--sakura)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--sakura)_72%,var(--foreground))]"
      : tone === "sumire"
        ? "bg-[color-mix(in_srgb,var(--sumire)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--sumire)_72%,var(--foreground))]"
        : "bg-[color-mix(in_srgb,var(--ramune)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--ramune)_72%,var(--foreground))]";
  const toneInk =
    tone === "sakura"
      ? "var(--sakura)"
      : tone === "sumire"
        ? "var(--sumire)"
        : "var(--ramune)";

  return (
    <div
      className="bg-background/55 p-3"
      style={{
        boxShadow: `0 1px 2px rgba(33,33,60,0.04), 3px 4px 0 color-mix(in srgb, ${toneInk} 20%, transparent)`,
      }}
    >
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${toneClass}`}>
        {icon}
        {title} · {candidates.length}
      </div>
      <div className="mt-2 space-y-2">
        {candidates.slice(0, 5).map((candidate) => (
          <div key={candidate.key} className="text-sm leading-6">
            <p className="font-medium text-foreground">{candidate.text}</p>
            {candidate.detail ? (
              <p className="text-muted-foreground">{candidate.detail}</p>
            ) : null}
            {candidate.recommendation ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {candidate.recommendation}
              </p>
            ) : null}
            {candidate.ruleIds.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {candidate.ruleIds.slice(0, 6).map((id) => (
                  <span
                    key={id}
                    className="bg-[color-mix(in_srgb,var(--foreground)_8%,var(--paper-stamp-mix))] px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {compactSourceId(id)}
                  </span>
                ))}
                {candidate.ruleIds.length > 6 ? (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    +{candidate.ruleIds.length - 6}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        {candidates.length > 5 ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            +{candidates.length - 5} more in the report
          </p>
        ) : null}
      </div>
    </div>
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
    <div
      className="bg-background/60 px-3 py-2"
      style={{
        boxShadow:
          "0 1px 2px rgba(33,33,60,0.04), 3px 4px 0 color-mix(in srgb, var(--teal) 20%, transparent)",
      }}
    >
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
        <p className="bg-background/50 px-3 py-2 text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </div>
  );
}

function compactSourceId(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function tasteRuleSource(rule: TasteRule): {
  detail: string;
  label: string;
  tone: "distillation" | "foundation" | "manual";
} {
  const sourceJobId = tasteRuleField(
    rule,
    "SourceJobId",
    "source_job_id",
  );
  const reportFileId = tasteRuleField(
    rule,
    "ReportFileId",
    "report_file_id",
  );

  if (sourceJobId.includes("foundation-md-extraction")) {
    return {
      detail: sourceJobId,
      label: "foundation docs",
      tone: "foundation",
    };
  }

  if (sourceJobId) {
    return {
      detail: sourceJobId,
      label: reportFileId
        ? `distillation ${compactSourceId(sourceJobId)}`
        : compactSourceId(sourceJobId),
      tone: "distillation",
    };
  }

  if (reportFileId) {
    return {
      detail: reportFileId,
      label: `report ${compactSourceId(reportFileId)}`,
      tone: "distillation",
    };
  }

  return {
    detail: "No source_job_id is recorded for this TasteRule.",
    label: "manual / unknown",
    tone: "manual",
  };
}

function TasteRuleSourceTag({ rule }: { rule: TasteRule }) {
  const source = tasteRuleSource(rule);
  const sourceClass =
    source.tone === "foundation"
      ? "bg-[color-mix(in_srgb,var(--ramune)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--ramune)_72%,var(--foreground))]"
      : source.tone === "distillation"
        ? "bg-[color-mix(in_srgb,var(--sumire)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--sumire)_72%,var(--foreground))]"
        : "bg-[color-mix(in_srgb,var(--foreground)_8%,var(--paper-stamp-mix))] text-muted-foreground";

  return (
    <span
      title={source.detail}
      className={`px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${sourceClass}`}
    >
      source: {source.label}
    </span>
  );
}

function TasteRulePolarityTag({ polarity }: { polarity: string }) {
  const polarityClass =
    polarity === "positive"
      ? "bg-[color-mix(in_srgb,var(--salad)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--salad)_72%,var(--foreground))]"
      : "bg-[color-mix(in_srgb,var(--sakura)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--sakura)_72%,var(--foreground))]";

  return (
    <span
      className={`px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${polarityClass}`}
    >
      {polarity}
    </span>
  );
}

function TasteRuleStatusTag({ status }: { status: string }) {
  const statusClass =
    status === "Accepted"
      ? "bg-[color-mix(in_srgb,var(--salad)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--salad)_72%,var(--foreground))]"
      : status === "Rejected"
        ? "bg-[color-mix(in_srgb,var(--sakura)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--sakura)_72%,var(--foreground))]"
        : "bg-[color-mix(in_srgb,var(--ramune)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--ramune)_72%,var(--foreground))]";

  return (
    <span
      className={`px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${statusClass}`}
    >
      {status}
    </span>
  );
}

function TasteRuleRejectButton({
  id,
  label = "reject",
}: {
  id: string;
  label?: string;
}) {
  return (
    <form action={rejectTasteRule.bind(null, id)}>
      <button
        title="Move this rule to Rejected so curator jobs stop reading it."
        className="inline-flex h-8 items-center gap-1.5 bg-[color-mix(in_srgb,var(--beni)_14%,var(--paper-stamp-mix))] px-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[color-mix(in_oklch,var(--beni)_72%,var(--foreground))] transition-all hover:-translate-y-[1px]"
      >
        <X className="h-3.5 w-3.5" />
        {label}
      </button>
    </form>
  );
}

function TasteRuleAcceptButton({ id }: { id: string }) {
  return (
    <form action={acceptTasteRule.bind(null, id)}>
      <button className="inline-flex h-8 items-center gap-1.5 bg-[color-mix(in_srgb,var(--salad)_14%,var(--paper-stamp-mix))] px-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[color-mix(in_oklch,var(--salad)_72%,var(--foreground))] transition-all hover:-translate-y-[1px]">
        <Check className="h-3.5 w-3.5" />
        accept
      </button>
    </form>
  );
}

function TasteRuleLine({
  rule,
  rejectable = false,
}: {
  rule: TasteRule;
  rejectable?: boolean;
}) {
  const title = tasteRuleField(rule, "Title", "title") || "Untitled rule";
  const polarity = tasteRuleField(rule, "Polarity", "polarity") || "negative";
  const patternType = tasteRuleField(rule, "PatternType", "pattern_type");
  const ruleText = tasteRuleField(rule, "RuleText", "rule_text") || title;
  const status = tasteRuleStatus(rule);

  return (
    <article
      className="bg-background/70 px-3 py-3"
      style={{
        boxShadow:
          "0 1px 2px rgba(33,33,60,0.04), 3px 4px 0 color-mix(in srgb, var(--ramune) 20%, transparent)",
      }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex shrink-0 flex-wrap gap-1.5 lg:max-w-[15rem]">
          <TasteRuleStatusTag status={status} />
          <TasteRulePolarityTag polarity={polarity} />
          <TasteRuleSourceTag rule={rule} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-6 text-foreground">
            {ruleText}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {patternType ? `${patternType} / ` : ""}
            {title}
          </p>
        </div>
        {rejectable ? (
          <div className="shrink-0">
            <TasteRuleRejectButton id={rule.entity_id} />
          </div>
        ) : null}
      </div>
    </article>
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

  return (
    <article
      className="bg-background/70 p-4"
      style={{
        boxShadow:
          "0 1px 2px rgba(33,33,60,0.04), 3px 4px 0 color-mix(in srgb, var(--sumire) 20%, transparent)",
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <TasteRuleStatusTag status={tasteRuleStatus(rule)} />
        <TasteRulePolarityTag polarity={polarity} />
        <TasteRuleSourceTag rule={rule} />
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
            className="inline-flex h-8 items-center gap-1.5 bg-[color-mix(in_srgb,var(--teal)_14%,var(--paper-stamp-mix))] px-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[color-mix(in_oklch,var(--teal)_72%,var(--foreground))] transition-colors hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            report
          </a>
        ) : null}

        {reviewable ? (
          <>
            <TasteRuleAcceptButton id={rule.entity_id} />
            <TasteRuleRejectButton id={rule.entity_id} />
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
          className="bg-[color-mix(in_srgb,var(--teal)_10%,var(--paper-stamp-mix))] px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
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
