// The fixed catalogue a generated screen is composed from. Jev chooses among
// these; nothing on a generated screen exists that is not named here. Plain
// TypeScript with no server imports, so the browser bundle can read the
// catalogue too (to label what was chosen).
//
// A plan is: one archetype (the page's shape), an ordered set of components
// from that archetype's slots, a density, an emphasis, and a kind for the form
// and table if they are present. Copy is fixed per component and kind; the
// only free text on a screen is the brief itself, used as the product's name.

export const ARCHETYPES = ["landing", "form", "dashboard", "list", "settings"] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const COMPONENTS = ["hero", "form", "stats", "table", "cards", "settings", "steps", "notice", "cta"] as const;
export type Component = (typeof COMPONENTS)[number];

export const DENSITIES = ["spacious", "comfortable", "compact"] as const;
export type Density = (typeof DENSITIES)[number];

export const EMPHASES = ["quiet", "balanced", "bold"] as const;
export type Emphasis = (typeof EMPHASES)[number];

export const FORM_KINDS = ["booking", "signup", "contact", "checkout", "search"] as const;
export type FormKind = (typeof FORM_KINDS)[number];

export const TABLE_KINDS = ["appointments", "orders", "transactions", "members", "tickets"] as const;
export type TableKind = (typeof TABLE_KINDS)[number];

export type ScreenPlan = {
  archetype: Archetype;
  components: Component[];
  density: Density;
  emphasis: Emphasis;
  form: FormKind;
  table: TableKind;
  /** "jev" when Jev chose; "fallback" when it could not be asked and a keyword rule chose. */
  source: "jev" | "fallback";
};

/** What Jev is told each option means. Descriptive, one line each. */
export const ARCHETYPE_TEXT: Record<Archetype, string> = {
  landing: "a marketing or landing page: a headline, a pitch, and a call to action",
  form: "a form the person fills in: booking, signing up, checking out, or getting in touch",
  dashboard: "a dashboard: key figures at the top and records below, for someone running the thing",
  list: "a list or table of records the person scans, sorts and opens",
  settings: "a settings or account page: rows of options the person turns on, off or edits",
};

export const COMPONENT_TEXT: Record<Component, string> = {
  hero: "a large headline block with a short pitch and one primary button",
  form: "a form with fields to fill in and a submit button",
  stats: "a row of three or four key figures",
  table: "a table of records with a few columns",
  cards: "a grid of item cards, each with a picture, a title and a line of detail",
  settings: "a list of options with switches and values the person can change",
  steps: "a progress indicator showing which step of several the person is on",
  notice: "a short notice or alert bar with one message",
  cta: "a closing band with one sentence and a button",
};

// Each archetype has a fixed order of slots. `always` components are on every
// screen of that shape; the rest are included when Jev judges the screen needs
// them. Order on the page is ORDER, the catalogue's, never the model's.
export const SLOTS: Record<Archetype, { always: Component[]; optional: Component[] }> = {
  landing: { always: ["hero", "cta"], optional: ["notice", "stats", "cards", "steps", "form"] },
  form: { always: ["form"], optional: ["notice", "steps", "hero", "cards"] },
  dashboard: { always: ["stats", "table"], optional: ["notice", "cards", "steps"] },
  list: { always: ["table"], optional: ["notice", "stats", "cards"] },
  settings: { always: ["settings"], optional: ["notice", "steps", "form"] },
};
const ORDER: Component[] = ["notice", "hero", "steps", "stats", "form", "settings", "table", "cards", "cta"];

// A screen carries at most this many components: an embodiment, not a component gallery.
export const MAX_COMPONENTS = 5;
/** Above this a component Jev judged "needed" is included. */
export const NEEDS_AT = 0.5;

export const FORM_FIELDS: Record<FormKind, { label: string; kind: "text" | "select" | "date" | "textarea" }[]> = {
  booking: [
    { label: "Your name", kind: "text" },
    { label: "Email", kind: "text" },
    { label: "Date", kind: "date" },
    { label: "Time", kind: "select" },
    { label: "Reason for the visit", kind: "textarea" },
  ],
  signup: [
    { label: "Full name", kind: "text" },
    { label: "Email", kind: "text" },
    { label: "Password", kind: "text" },
  ],
  contact: [
    { label: "Name", kind: "text" },
    { label: "Email", kind: "text" },
    { label: "Message", kind: "textarea" },
  ],
  checkout: [
    { label: "Name on card", kind: "text" },
    { label: "Card number", kind: "text" },
    { label: "Expiry", kind: "select" },
    { label: "Delivery address", kind: "textarea" },
  ],
  search: [
    { label: "Where", kind: "text" },
    { label: "From", kind: "date" },
    { label: "To", kind: "date" },
    { label: "Travellers", kind: "select" },
  ],
};

export const FORM_SUBMIT: Record<FormKind, string> = {
  booking: "Book",
  signup: "Create account",
  contact: "Send",
  checkout: "Pay",
  search: "Search",
};

export const TABLE_COLUMNS: Record<TableKind, { head: string[]; rows: string[][] }> = {
  appointments: {
    head: ["Time", "Who", "With", "Status"],
    rows: [
      ["09:00", "Mabel", "Dr Okafor", "Confirmed"],
      ["09:30", "Biscuit", "Dr Lind", "Waiting"],
      ["10:15", "Juno", "Dr Okafor", "Confirmed"],
      ["11:00", "Pip", "Nurse Adeyemi", "Cancelled"],
    ],
  },
  orders: {
    head: ["Order", "Customer", "Total", "Status"],
    rows: [
      ["#4821", "A. Sato", "£84.00", "Shipped"],
      ["#4822", "R. Meyer", "£12.50", "Packing"],
      ["#4823", "L. Nkemelu", "£230.00", "Paid"],
      ["#4824", "J. Park", "£56.10", "Refunded"],
    ],
  },
  transactions: {
    head: ["Date", "Description", "Amount", "Balance"],
    rows: [
      ["12 Sep", "Salary", "+£2,400.00", "£3,118.20"],
      ["13 Sep", "Rent", "-£1,150.00", "£1,968.20"],
      ["14 Sep", "Groceries", "-£62.40", "£1,905.80"],
      ["15 Sep", "Transfer", "-£300.00", "£1,605.80"],
    ],
  },
  members: {
    head: ["Name", "Role", "Joined", "Status"],
    rows: [
      ["Ines Ferreira", "Admin", "Jan 2025", "Active"],
      ["Tomasz Wolny", "Editor", "Mar 2025", "Active"],
      ["Ada Kimani", "Viewer", "Jun 2025", "Invited"],
      ["Sam Ortiz", "Editor", "Aug 2025", "Active"],
    ],
  },
  tickets: {
    head: ["Ticket", "Subject", "Priority", "Status"],
    rows: [
      ["#1041", "Login loop on mobile", "High", "Open"],
      ["#1042", "Invoice PDF blank", "Medium", "In progress"],
      ["#1043", "Rename workspace", "Low", "Waiting"],
      ["#1044", "Export fails past 10k", "High", "Open"],
    ],
  },
};

export const STATS = [
  { label: "Today", value: "24" },
  { label: "This week", value: "163" },
  { label: "Open", value: "7" },
  { label: "On time", value: "96%" },
];

export const CARDS = [
  { title: "First item", detail: "A line of detail about it." },
  { title: "Second item", detail: "What makes this one different." },
  { title: "Third item", detail: "Something short and useful." },
];

export const SETTINGS_ROWS = [
  { label: "Email reminders", value: "On", toggle: true },
  { label: "Weekly summary", value: "Off", toggle: false },
  { label: "Time zone", value: "Europe/London", toggle: null },
  { label: "Language", value: "English", toggle: null },
];

export const STEPS = ["Details", "Choose a time", "Confirm"];

export const NAV: Record<Archetype, string[]> = {
  landing: ["Product", "Pricing", "About"],
  form: ["Home", "Book", "Help"],
  dashboard: ["Overview", "Records", "Reports"],
  list: ["All", "Recent", "Archived"],
  settings: ["Profile", "Preferences", "Billing"],
};

/** The Jev fan-out: one call, every option asked as its own question. */
export function planQuestions(): Record<string, { type: "noul"; instructions: string } | { type: "score"; instructions: string; criteria: string[] }> {
  const q: Record<string, { type: "noul"; instructions: string } | { type: "score"; instructions: string; criteria: string[] }> = {};
  for (const a of ARCHETYPES) q[`a_${a}`] = { type: "noul", instructions: `The screen asked for is best built as ${ARCHETYPE_TEXT[a]}.` };
  for (const c of COMPONENTS) q[`c_${c}`] = { type: "noul", instructions: `The screen asked for needs ${COMPONENT_TEXT[c]}.` };
  q.density = { type: "score", instructions: "How dense should this screen be?", criteria: ["spacious: few things, a lot of room", "comfortable: an ordinary amount", "compact: many things close together, for someone working"] };
  q.emphasis = { type: "score", instructions: "How loud should this screen be?", criteria: ["quiet: little colour, small type, nothing shouts", "balanced", "bold: big type and strong colour, meant to be noticed"] };
  for (const f of FORM_KINDS) q[`f_${f}`] = { type: "noul", instructions: `If this screen has a form, it is a ${f} form.` };
  for (const t of TABLE_KINDS) q[`t_${t}`] = { type: "noul", instructions: `If this screen has a table, its rows are ${t}.` };
  return q;
}

type Answers = Record<string, { noul?: number; score?: number } | undefined>;

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function argmax<T extends string>(options: readonly T[], value: (o: T) => number): T {
  let best = options[0];
  let bestV = -Infinity;
  for (const o of options) {
    const v = value(o);
    if (v > bestV) {
      best = o;
      bestV = v;
    }
  }
  return best;
}

/** Compose a plan from Jev's answers. Deterministic: the same answers give the same plan. */
export function composePlan(answers: Answers): ScreenPlan {
  const noul = (k: string) => num(answers[k]?.noul, 0);
  const archetype = argmax(ARCHETYPES, (a) => noul(`a_${a}`));
  const slots = SLOTS[archetype];
  const wanted = slots.optional.filter((c) => noul(`c_${c}`) >= NEEDS_AT).sort((x, y) => noul(`c_${y}`) - noul(`c_${x}`));
  const chosen = new Set<Component>([...slots.always, ...wanted.slice(0, MAX_COMPONENTS - slots.always.length)]);
  const components = ORDER.filter((c) => chosen.has(c));
  const level = (k: string, n: number) => Math.min(n - 1, Math.max(0, Math.round(num(answers[k]?.score, (n - 1) / 2))));
  return {
    archetype,
    components,
    density: DENSITIES[level("density", DENSITIES.length)],
    emphasis: EMPHASES[level("emphasis", EMPHASES.length)],
    form: argmax(FORM_KINDS, (f) => noul(`f_${f}`)),
    table: argmax(TABLE_KINDS, (t) => noul(`t_${t}`)),
    source: "jev",
  };
}

/** When Jev cannot be asked: a keyword rule over the brief. Sensible, not clever. */
export function fallbackPlan(brief: string): ScreenPlan {
  const b = brief.toLowerCase();
  const has = (...words: string[]) => words.some((w) => b.includes(w));
  const archetype: Archetype = has("dashboard", "admin", "metrics", "analytics", "overview")
    ? "dashboard"
    : has("settings", "preferences", "account", "profile")
      ? "settings"
      : has("list", "table", "orders", "tickets", "inbox", "queue")
        ? "list"
        : has("form", "book", "sign up", "signup", "register", "checkout", "contact", "apply")
          ? "form"
          : "landing";
  const form: FormKind = has("sign up", "signup", "register") ? "signup" : has("checkout", "pay") ? "checkout" : has("contact", "message") ? "contact" : has("search", "find", "travel", "ferry", "flight") ? "search" : "booking";
  const table: TableKind = has("order", "shop") ? "orders" : has("bank", "finance", "transaction") ? "transactions" : has("member", "team", "user") ? "members" : has("ticket", "support") ? "tickets" : "appointments";
  return {
    archetype,
    components: ORDER.filter((c) => SLOTS[archetype].always.includes(c) || (archetype === "landing" && c === "cards")),
    density: archetype === "dashboard" || archetype === "list" ? "compact" : "comfortable",
    emphasis: archetype === "landing" ? "bold" : "balanced",
    form,
    table,
    source: "fallback",
  };
}

/** True when a value is a whole plan from this catalogue (for JSON handed back to a route). */
export function isPlan(v: unknown): v is ScreenPlan {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    ARCHETYPES.includes(p.archetype as Archetype) &&
    Array.isArray(p.components) && p.components.every((c) => COMPONENTS.includes(c as Component)) &&
    DENSITIES.includes(p.density as Density) &&
    EMPHASES.includes(p.emphasis as Emphasis) &&
    FORM_KINDS.includes(p.form as FormKind) &&
    TABLE_KINDS.includes(p.table as TableKind)
  );
}
