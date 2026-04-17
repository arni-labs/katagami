"use client";

import * as Tabs from "@radix-ui/react-tabs";
import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Progress from "@radix-ui/react-progress";
import * as Separator from "@radix-ui/react-separator";
import * as Avatar from "@radix-ui/react-avatar";
import * as Switch from "@radix-ui/react-switch";
import {
  CheckIcon,
  ChevronDownIcon,
  Cross2Icon,
  ArrowRightIcon,
} from "@radix-ui/react-icons";

export function KukanPressRadix() {
  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="kp">
        <style>{styles}</style>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
        />

        <main className="kp-page">
          {/* Top Bar */}
          <header className="kp-topbar">
            <div className="kp-brand">Kukan Press</div>
            <div className="kp-meta-row">
              <span className="kp-chip">Issue 12 / City Rhythm</span>
              <span className="kp-chip">Tokyo Editorial Web</span>
            </div>
            <nav className="kp-nav">
              <Tabs.Root defaultValue="features">
                <Tabs.List className="kp-nav-tabs">
                  <Tabs.Trigger value="features" className="kp-nav-link">
                    Features
                  </Tabs.Trigger>
                  <Tabs.Trigger value="notes" className="kp-nav-link">
                    Notes
                  </Tabs.Trigger>
                  <Tabs.Trigger value="archive" className="kp-nav-link">
                    Archive
                  </Tabs.Trigger>
                </Tabs.List>
              </Tabs.Root>
            </nav>
            <div className="kp-ticker">
              <span>Updated 11:48 JST</span>
              <span>12 stories</span>
            </div>
          </header>

          {/* Issue Banner */}
          <section className="kp-banner">
            <div className="kp-section-num">12</div>
            <div className="kp-banner-copy">
              <div className="kp-kicker">
                <span>Urban Leisure Ledger</span>
                <span>&bull;</span>
                <span>Weekend Field Notes</span>
              </div>
              <h1 className="kp-headline">
                Many small ways into the same city.
              </h1>
              <p className="kp-subtitle">
                A magazine-like culture front composed from stories, fragments,
                side notes, and archives. The experience favors discovery over a
                single hero statement.
              </p>
            </div>
            <aside className="kp-side-facts">
              <div>
                <span className="kp-mono-label">Coverage</span>
                <strong className="kp-fact-num">24 wards</strong>
              </div>
              <Separator.Root className="kp-sep" />
              <div>
                <span className="kp-mono-label">This issue</span>
                <strong className="kp-fact-num">17 scenes</strong>
              </div>
              <Separator.Root className="kp-sep" />
              <div>
                <span className="kp-mono-label">Editorial angle</span>
                <p className="kp-fact-note">
                  Neighborhood rituals, late-night interiors, compact retail
                  theater.
                </p>
              </div>
            </aside>
          </section>

          <Separator.Root className="kp-rule" />

          {/* Story Grid */}
          <section className="kp-grid">
            {/* HERO MODULE */}
            <article className="kp-module kp-hero">
              <span className="kp-sticker">Editors&apos; Pick</span>
              <div className="kp-module-header">
                <div className="kp-label-set">
                  <span>Feature</span>
                  <span>Shibuya / 08 min read</span>
                </div>
                <time>May 2026</time>
              </div>
              <div className="kp-image kp-image-tall">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80"
                  alt=""
                  className="kp-img"
                  style={{ objectPosition: "center 35%" }}
                />
                <div className="kp-offset-note">
                  <strong>Side note</strong>
                  <p className="kp-caption">
                    The image remains cropped so route notes and timings carry as
                    much weight as the visual scene.
                  </p>
                </div>
              </div>
              <div className="kp-body">
                <div className="kp-kicker">
                  <span>Grid A-01</span>
                  <span>Photo Essay</span>
                  <span>Night Route</span>
                </div>
                <h2 className="kp-h2">
                  The coffee counters that became unofficial city observatories.
                </h2>
                <p>
                  Compact venues documented through tightly cropped frames, short
                  annotations, and service metadata.
                </p>
                <div className="kp-stats">
                  <div>
                    <span className="kp-mono-label">Stops</span>
                    <strong className="kp-stat-val">06</strong>
                  </div>
                  <div>
                    <span className="kp-mono-label">Last train</span>
                    <strong className="kp-stat-val">22m</strong>
                  </div>
                  <div>
                    <span className="kp-mono-label">Avg. stay</span>
                    <strong className="kp-stat-val">47m</strong>
                  </div>
                  <div>
                    <span className="kp-mono-label">Budget</span>
                    <strong className="kp-stat-val">&yen;&yen;</strong>
                  </div>
                </div>
              </div>
            </article>

            {/* NOTE PANEL — with Accordion */}
            <aside className="kp-module kp-note-panel">
              <div className="kp-module-header">
                <div className="kp-label-set">
                  <span>Notebook</span>
                  <span>Field cues</span>
                </div>
                <time>Desk memo</time>
              </div>
              <div className="kp-body">
                <div className="kp-kicker">
                  <span>Margin Notes</span>
                  <span>Index 04</span>
                </div>
                <h3 className="kp-h3">
                  What to notice before the headline arrives.
                </h3>
                <Accordion.Root type="multiple" defaultValue={["item-1"]}>
                  {[
                    {
                      id: "item-1",
                      idx: "01",
                      label: "Entrance ritual",
                      text: "Signage smaller than expected, but hyper-specific.",
                    },
                    {
                      id: "item-2",
                      idx: "02",
                      label: "Sound",
                      text: "Mechanical hum and low-volume narration shape the mood.",
                    },
                    {
                      id: "item-3",
                      idx: "03",
                      label: "Product edit",
                      text: "Fewer objects, tighter categories, denser explanation.",
                    },
                    {
                      id: "item-4",
                      idx: "04",
                      label: "Exit path",
                      text: "A small purchase often functions like a bookmark.",
                    },
                  ].map((note) => (
                    <Accordion.Item
                      key={note.id}
                      value={note.id}
                      className="kp-acc-item"
                    >
                      <Accordion.Trigger className="kp-acc-trigger">
                        <span className="kp-mono-label">
                          {note.idx} / {note.label}
                        </span>
                        <ChevronDownIcon className="kp-acc-chevron" />
                      </Accordion.Trigger>
                      <Accordion.Content className="kp-acc-content">
                        <strong>{note.text}</strong>
                      </Accordion.Content>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
                <div className="kp-floating-circle" />
              </div>
            </aside>

            {/* FEATURE MODULE */}
            <article className="kp-module kp-feature">
              <div className="kp-module-header">
                <div className="kp-label-set">
                  <span>Places</span>
                  <span>Kanda</span>
                </div>
                <time>7 selections</time>
              </div>
              <div className="kp-image kp-image-strip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1200&q=80"
                  alt=""
                  className="kp-img"
                  style={{ objectPosition: "center 30%" }}
                />
              </div>
              <div className="kp-body">
                <div className="kp-kicker">
                  <span>Column B-02</span>
                  <span>Shortlist</span>
                </div>
                <h3 className="kp-h3">
                  Bookshop corners for slow, rainy browsing.
                </h3>
                <p>
                  Micro-recommendations framed as active supporting stories
                  rather than filler.
                </p>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <a className="kp-index-link" href="#archive">
                      <span>See annotated map</span>
                      <ArrowRightIcon />
                    </a>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="kp-tooltip" sideOffset={6}>
                      7 curated bookshops with walking routes
                      <Tooltip.Arrow className="kp-tooltip-arrow" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </div>
            </article>

            {/* CULTURE DUAL FRAME */}
            <article className="kp-module kp-wide-culture">
              <div className="kp-module-header">
                <div className="kp-label-set">
                  <span>Culture</span>
                  <span>Dual Frame</span>
                </div>
                <time>Visual compare</time>
              </div>
              <div className="kp-image-split">
                <div className="kp-split-a">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80"
                    alt=""
                    className="kp-img"
                    style={{ objectPosition: "center 40%" }}
                  />
                </div>
                <div className="kp-split-b">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80"
                    alt=""
                    className="kp-img"
                    style={{ objectPosition: "center 25%" }}
                  />
                </div>
              </div>
              <div className="kp-body">
                <div className="kp-kicker">
                  <span>Spread C-01</span>
                  <span>Styled Contrast</span>
                </div>
                <h3 className="kp-h3">
                  Two silhouettes, one shopping district, entirely different
                  social energy.
                </h3>
                <p>
                  Collage rhythm from split image windows and metadata-led
                  interpretation.
                </p>
              </div>
            </article>

            {/* TALL SLICE */}
            <article className="kp-module kp-tall-slice">
              <div className="kp-module-header">
                <div className="kp-label-set">
                  <span>Slice</span>
                </div>
                <time>Look 03</time>
              </div>
              <div className="kp-image kp-image-cropped">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80"
                  alt=""
                  className="kp-img"
                />
              </div>
              <div className="kp-body">
                <div className="kp-kicker">
                  <span>Frame D-07</span>
                  <span>Close read</span>
                </div>
                <p>
                  A narrow visual module preserves magazine cadence between
                  denser text blocks.
                </p>
                {/* Progress as a reading position indicator */}
                <div className="kp-reading-meter">
                  <span className="kp-mono-label">Reading depth</span>
                  <Progress.Root className="kp-progress" value={42}>
                    <Progress.Indicator
                      className="kp-progress-fill"
                      style={{ width: "42%" }}
                    />
                  </Progress.Root>
                </div>
              </div>
            </article>

            {/* INDEX PANEL */}
            <section className="kp-module kp-list-panel">
              <div className="kp-module-header">
                <div className="kp-label-set">
                  <span>Index</span>
                  <span>Quick entry</span>
                </div>
                <time>12 links</time>
              </div>
              <div className="kp-body kp-side-index">
                <div className="kp-kicker">
                  <span>Read Paths</span>
                  <span>Fast Scan</span>
                </div>
                {[
                  { label: "Late trains and coffee counters", num: "01" },
                  { label: "Weekend stationery circuit", num: "02" },
                  { label: "Three rooftops under ¥1800", num: "03" },
                  { label: "Mini interview: quiet retail theater", num: "04" },
                ].map((link) => (
                  <a key={link.num} className="kp-index-link" href="#features">
                    <span>{link.label}</span>
                    <span className="kp-mono-label">{link.num}</span>
                  </a>
                ))}
              </div>
            </section>

            {/* SUBMIT TIP — Dialog trigger */}
            <section className="kp-module kp-form-panel">
              <div className="kp-module-header">
                <div className="kp-label-set">
                  <span>Submit tip</span>
                  <span>Reader desk</span>
                </div>
                <time>Open this week</time>
              </div>
              <div className="kp-body">
                <div className="kp-kicker">
                  <span>Participation</span>
                  <span>Desk Form</span>
                  <span>Issue 13</span>
                </div>
                <h3 className="kp-h3">
                  Send a place with a ritual worth documenting.
                </h3>
                <Dialog.Root>
                  <Dialog.Trigger asChild>
                    <button className="kp-submit-btn">Open desk form</button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="kp-dialog-overlay" />
                    <Dialog.Content className="kp-dialog">
                      <Dialog.Title className="kp-dialog-title">
                        Send a tip to the desk
                      </Dialog.Title>
                      <Dialog.Description className="kp-dialog-desc">
                        Places with timings, price bands, and one strange detail
                        move fastest.
                      </Dialog.Description>
                      <Separator.Root className="kp-sep" />
                      <div className="kp-form-grid">
                        <label className="kp-form-row">
                          <span className="kp-mono-label">Place name</span>
                          <input
                            className="kp-field"
                            placeholder="e.g. tiny curry counter in Koenji"
                          />
                        </label>
                        <label className="kp-form-row">
                          <span className="kp-mono-label">District</span>
                          <Select.Root defaultValue="choose">
                            <Select.Trigger className="kp-select-trigger">
                              <Select.Value />
                              <Select.Icon>
                                <ChevronDownIcon />
                              </Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content className="kp-select-content">
                                <Select.Viewport>
                                  <Select.Item
                                    value="choose"
                                    className="kp-select-item"
                                  >
                                    <Select.ItemText>
                                      Choose area
                                    </Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="koenji"
                                    className="kp-select-item"
                                  >
                                    <Select.ItemText>Koenji</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="kiyosumi"
                                    className="kp-select-item"
                                  >
                                    <Select.ItemText>Kiyosumi</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="shimokitazawa"
                                    className="kp-select-item"
                                  >
                                    <Select.ItemText>
                                      Shimokitazawa
                                    </Select.ItemText>
                                  </Select.Item>
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </label>
                        <div className="kp-form-row">
                          <span className="kp-mono-label">Editorial fit</span>
                          <div className="kp-toggle-row">
                            {["Very specific", "Late hours", "Visual texture"].map(
                              (opt, i) => (
                                <label key={opt} className="kp-pill-option">
                                  <Checkbox.Root
                                    className="kp-radio-dot"
                                    defaultChecked={i === 0}
                                  >
                                    <Checkbox.Indicator className="kp-radio-fill" />
                                  </Checkbox.Root>
                                  <span className="kp-mono-label">{opt}</span>
                                </label>
                              )
                            )}
                          </div>
                        </div>
                        <label className="kp-form-row">
                          <span className="kp-mono-label">
                            What detail should we notice?
                          </span>
                          <textarea
                            className="kp-field kp-textarea"
                            placeholder="Queue behavior, soundtrack, menu edit, counter arrangement..."
                          />
                        </label>
                      </div>
                      <div className="kp-dialog-footer">
                        <span className="kp-mono-label">
                          Tips with one strange detail move fastest.
                        </span>
                        <button className="kp-submit-btn">Send to desk</button>
                      </div>
                      <Dialog.Close asChild>
                        <button className="kp-dialog-close">
                          <Cross2Icon />
                        </button>
                      </Dialog.Close>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>

                {/* Inline form preview with Switch */}
                <div className="kp-inline-toggle">
                  <span className="kp-mono-label">Notify on publish</span>
                  <Switch.Root className="kp-switch" defaultChecked>
                    <Switch.Thumb className="kp-switch-thumb" />
                  </Switch.Root>
                </div>
              </div>
            </section>

            {/* QUOTE PANEL */}
            <section className="kp-module kp-quote-panel">
              <div className="kp-module-header">
                <div className="kp-label-set">
                  <span>Quote</span>
                  <span>Editor note</span>
                </div>
                <time>Desk line</time>
              </div>
              <div className="kp-image kp-image-strip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80"
                  alt=""
                  className="kp-img"
                  style={{ objectPosition: "center 40%" }}
                />
              </div>
              <div className="kp-body">
                <div className="kp-kicker">
                  <span>Section 03</span>
                  <span>Why this issue</span>
                </div>
                <p className="kp-quote">
                  Good editorial density makes browsing feel like overhearing a
                  city think aloud.
                </p>
                <div className="kp-byline-row">
                  <Avatar.Root className="kp-avatar">
                    <Avatar.Fallback className="kp-avatar-fb">WE</Avatar.Fallback>
                  </Avatar.Root>
                  <span className="kp-mono-label">
                    Weekend Editor / Kukan Press
                  </span>
                </div>
              </div>
            </section>

            {/* ARCHIVE PANEL — Accordion */}
            <section className="kp-module kp-archive-panel">
              <div className="kp-module-header">
                <div className="kp-label-set">
                  <span>Archive</span>
                  <span>Back issues</span>
                </div>
                <time>Selected</time>
              </div>
              <div className="kp-body">
                <div className="kp-kicker">
                  <span>Issue Lineage</span>
                  <span>Recent</span>
                </div>
                <Accordion.Root type="single" collapsible defaultValue="arch-1">
                  {[
                    {
                      id: "arch-1",
                      status: "Open",
                      num: "09",
                      title: "Small Music Bars, Big Memory",
                      desc: "Annotated acoustics, seating diagrams, and neighborhood timing notes.",
                    },
                    {
                      id: "arch-2",
                      status: "Filed",
                      num: "10",
                      title: "Transit Snacks After 21:00",
                      desc: "Route-first shopping stories organized by station exits.",
                    },
                    {
                      id: "arch-3",
                      status: "Filed",
                      num: "11",
                      title: "Quiet Floors Above Busy Streets",
                      desc: "Elevator lobbies, hidden salons, upper-level micro-retail.",
                    },
                  ].map((arch) => (
                    <Accordion.Item
                      key={arch.id}
                      value={arch.id}
                      className="kp-arch-item"
                    >
                      <Accordion.Trigger className="kp-arch-trigger">
                        <span className="kp-status-pill">{arch.status}</span>
                        <strong className="kp-arch-title">{arch.title}</strong>
                        <span className="kp-mono-label">{arch.num}</span>
                        <ChevronDownIcon className="kp-acc-chevron" />
                      </Accordion.Trigger>
                      <Accordion.Content className="kp-arch-content">
                        <p>{arch.desc}</p>
                      </Accordion.Content>
                    </Accordion.Item>
                  ))}
                </Accordion.Root>
              </div>
            </section>
          </section>

          {/* Footer */}
          <footer className="kp-footer">
            {[
              {
                label: "Edition logic",
                text: "Dense modules, paced gutters, no oversized hero monopoly.",
              },
              {
                label: "Typographic stack",
                text: "Serif display, gothic body, mono metadata.",
              },
              {
                label: "Image rule",
                text: "Crop for judgment; never reveal everything at once.",
              },
              {
                label: "Accent rule",
                text: "Playful offsets remain grid-anchored and editorially useful.",
              },
            ].map((foot) => (
              <div key={foot.label} className="kp-footer-cell">
                <span className="kp-mono-label">{foot.label}</span>
                <p>{foot.text}</p>
              </div>
            ))}
          </footer>
        </main>
      </div>
    </Tooltip.Provider>
  );
}

const styles = `
.kp {
  --bg: #F4F0E8;
  --surface: #FFFDF8;
  --paper: #F8F4EC;
  --ink: #151515;
  --muted: #746E67;
  --line: #1E1E1E;
  --accent: #E94B35;
  --accent-soft: #F6D8D0;
  --sage: #DCE5DA;
  --shadow: 0 18px 50px rgba(17,17,17,0.12);
  --rule: 1px solid var(--line);
  --rule-bold: 3px solid var(--line);
  --transition: 180ms cubic-bezier(0.2, 0.8, 0.2, 1);

  min-height: 100%;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  color: var(--ink);
  line-height: 1.55;
  padding: 24px;
  background:
    linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px),
    var(--bg);
  background-size: 24px 24px, 24px 24px, auto;
}

.kp-page {
  max-width: 1440px;
  margin: 0 auto;
  background: rgba(255,253,248,0.9);
  border: var(--rule);
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}
.kp-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.35), transparent 20%, transparent 80%, rgba(0,0,0,0.02));
  pointer-events: none;
}

/* Topbar */
.kp-topbar {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 18px;
  border-bottom: var(--rule);
  background: rgba(255,255,255,0.65);
  position: relative;
  z-index: 1;
}
.kp-brand {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.kp-meta-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.kp-chip {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  border: var(--rule);
  padding: 5px 8px;
  background: var(--surface);
}
.kp-nav-tabs {
  display: flex;
  gap: 12px;
  align-items: center;
}
.kp-nav-link {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  text-decoration: none;
  color: var(--ink);
  padding-bottom: 2px;
  border: none;
  border-bottom: 1px solid transparent;
  background: none;
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition);
}
.kp-nav-link:hover,
.kp-nav-link[data-state="active"] {
  border-bottom-color: var(--accent);
  color: var(--accent);
}
.kp-ticker {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

/* Banner */
.kp-banner {
  display: grid;
  grid-template-columns: 120px 1fr 210px;
  gap: 18px;
  padding: 18px;
  border-bottom: var(--rule);
  align-items: end;
  position: relative;
  z-index: 1;
}
.kp-section-num {
  font-family: 'Cormorant Garamond', serif;
  font-size: 5.2rem;
  line-height: 0.85;
  border-right: var(--rule);
  padding-right: 16px;
}
.kp-headline {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(2.8rem, 5vw, 5rem);
  line-height: 0.92;
  max-width: 10ch;
  margin: 10px 0 12px;
}
.kp-kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-top: var(--rule-bold);
  padding-top: 10px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.kp-subtitle {
  max-width: 56ch;
  color: var(--muted);
  font-size: 0.98rem;
}
.kp-side-facts {
  background: var(--paper);
  border: var(--rule);
  padding: 14px;
  display: grid;
  gap: 12px;
  align-self: stretch;
}
.kp-fact-num {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.7rem;
  display: block;
  margin-top: 2px;
}
.kp-fact-note {
  font-size: 0.88rem;
  color: var(--muted);
  margin-top: 4px;
}

/* Shared mono label */
.kp-mono-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}

/* Separators */
.kp-rule {
  border: none;
  border-top: var(--rule);
}
.kp-sep {
  border: none;
  border-top: var(--rule);
  height: 0;
}

/* Grid */
.kp-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 18px;
  padding: 18px;
  position: relative;
  z-index: 1;
}

/* Module base */
.kp-module {
  background: var(--surface);
  border: var(--rule);
  display: grid;
  align-content: start;
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
  position: relative;
  overflow: hidden;
  min-height: 180px;
}
.kp-module:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 24px rgba(17,17,17,0.08);
  border-color: var(--accent);
}
.kp-module-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  border-top: var(--rule-bold);
  border-bottom: var(--rule);
  padding: 10px 12px;
  background: rgba(255,255,255,0.72);
}
.kp-module-header time {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.kp-label-set {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.kp-body {
  padding: 14px 14px 16px;
  display: grid;
  gap: 12px;
}
.kp-h2 {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(2rem, 3vw, 3.4rem);
  line-height: 0.96;
  font-weight: 600;
  max-width: 10ch;
}
.kp-h3 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.8rem;
  line-height: 0.96;
  font-weight: 600;
}
.kp-body p {
  color: #37322E;
  font-size: 0.95rem;
}

/* Module sizes */
.kp-hero { grid-column: span 6; min-height: 560px; }
.kp-note-panel { grid-column: span 3; min-height: 560px; background: var(--accent-soft); }
.kp-feature { grid-column: span 3; min-height: 380px; }
.kp-wide-culture { grid-column: span 5; min-height: 360px; }
.kp-tall-slice { grid-column: span 2; min-height: 360px; }
.kp-list-panel { grid-column: span 3; min-height: 360px; }
.kp-form-panel { grid-column: span 4; min-height: 390px; }
.kp-quote-panel { grid-column: span 4; min-height: 390px; }
.kp-archive-panel { grid-column: span 4; min-height: 390px; }

/* Images */
.kp-image {
  border-bottom: var(--rule);
  position: relative;
  overflow: hidden;
  background: #ddd;
}
.kp-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scale(1.08);
  filter: contrast(0.95) saturate(0.9);
  transition: transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.kp-module:hover .kp-img {
  transform: scale(1.12);
}
.kp-image::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.12));
  pointer-events: none;
}
.kp-image-tall { height: 250px; }
.kp-image-strip { height: 120px; }
.kp-image-cropped { height: 220px; }

/* Offset note (overlaid on hero image) */
.kp-offset-note {
  position: absolute;
  left: 14px;
  bottom: 14px;
  background: var(--surface);
  border: var(--rule);
  padding: 10px 12px;
  max-width: 190px;
  transform: translateY(8px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  z-index: 2;
}
.kp-offset-note strong {
  display: block;
  margin-bottom: 4px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.1rem;
}
.kp-caption {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}

.kp-image-split {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  height: 200px;
  border-bottom: var(--rule);
}
.kp-split-a, .kp-split-b {
  position: relative;
  overflow: hidden;
  background: #ddd;
}
.kp-split-b {
  border-left: var(--rule);
}

/* Sticker */
.kp-sticker {
  position: absolute;
  top: 16px;
  right: 18px;
  background: var(--accent);
  color: white;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 8px 10px;
  transform: rotate(4deg);
  z-index: 2;
  border: var(--rule);
}

/* Stats */
.kp-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.kp-stats > div {
  border-top: var(--rule);
  padding-top: 8px;
}
.kp-stat-val {
  display: block;
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem;
  line-height: 1;
}

/* Accordion (field notes) */
.kp-acc-item {
  border-top: var(--rule);
}
.kp-acc-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink);
  font-weight: 500;
}
.kp-acc-chevron {
  transition: transform 200ms;
  flex-shrink: 0;
}
.kp-acc-trigger[data-state="open"] .kp-acc-chevron {
  transform: rotate(180deg);
}
.kp-acc-content {
  overflow: hidden;
  padding-bottom: 10px;
  font-size: 1rem;
  font-weight: 700;
}
.kp-floating-circle {
  position: absolute;
  width: 84px;
  height: 84px;
  border: 1px dashed var(--line);
  border-radius: 50%;
  right: -20px;
  bottom: 28px;
  opacity: 0.55;
}

/* Index links */
.kp-index-link {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  text-decoration: none;
  color: var(--ink);
  border-bottom: var(--rule);
  padding-bottom: 8px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  transition: color var(--transition);
}
.kp-index-link:hover {
  color: var(--accent);
}
.kp-index-link:last-child {
  border-bottom: none;
}
.kp-side-index {
  gap: 8px;
}

/* Reading meter */
.kp-reading-meter {
  display: grid;
  gap: 6px;
  margin-top: 4px;
}
.kp-progress {
  width: 100%;
  height: 6px;
  background: rgba(0,0,0,0.06);
  border: var(--rule);
  overflow: hidden;
}
.kp-progress-fill {
  height: 100%;
  background: var(--ink);
  transition: width 400ms;
}

/* Quote */
.kp-quote {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.2rem;
  line-height: 0.98;
  max-width: 12ch;
  position: relative;
  color: var(--ink);
}
.kp-quote::after {
  content: '';
  display: block;
  width: 62px;
  border-bottom: 3px solid var(--accent);
  margin-top: 14px;
  transform: translateX(6px);
}
.kp-byline-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.kp-avatar {
  display: inline-flex;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: var(--rule);
  flex-shrink: 0;
}
.kp-avatar-fb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  background: var(--sage);
  color: var(--ink);
}

/* Submit button */
.kp-submit-btn {
  border: var(--rule);
  background: var(--ink);
  color: white;
  padding: 12px 18px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition: transform var(--transition), background var(--transition);
}
.kp-submit-btn:hover {
  transform: translateY(-2px);
  background: var(--accent);
}

/* Switch */
.kp-inline-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.kp-switch {
  width: 40px;
  height: 22px;
  border: var(--rule);
  background: var(--paper);
  position: relative;
  cursor: pointer;
}
.kp-switch[data-state="checked"] {
  background: var(--ink);
}
.kp-switch-thumb {
  display: block;
  width: 16px;
  height: 16px;
  background: white;
  border: var(--rule);
  transition: transform 150ms;
  transform: translateX(2px);
}
.kp-switch[data-state="checked"] .kp-switch-thumb {
  transform: translateX(19px);
}

/* Archive accordion */
.kp-arch-item {
  border-top: var(--rule);
}
.kp-arch-trigger {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 10px 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink);
  text-align: left;
}
.kp-status-pill {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border: var(--rule);
  padding: 5px 8px;
  background: var(--sage);
}
.kp-arch-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.4rem;
  line-height: 0.95;
}
.kp-arch-content {
  overflow: hidden;
  padding-bottom: 10px;
  font-size: 0.9rem;
  color: var(--muted);
}

/* Dialog */
.kp-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(244,240,232,0.88);
  backdrop-filter: blur(6px);
  z-index: 100;
}
.kp-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 101;
  width: min(560px, 90vw);
  max-height: 85vh;
  overflow-y: auto;
  padding: 28px;
  background: var(--surface);
  border: var(--rule);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.kp-dialog-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem;
  font-weight: 600;
}
.kp-dialog-desc {
  font-size: 0.9rem;
  color: var(--muted);
}
.kp-dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-top: var(--rule);
  padding-top: 14px;
  margin-top: 4px;
}
.kp-dialog-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: var(--rule);
  background: var(--surface);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.kp-form-grid {
  display: grid;
  gap: 14px;
}
.kp-form-row {
  display: grid;
  gap: 6px;
}
.kp-field {
  width: 100%;
  border: var(--rule);
  background: rgba(255,255,255,0.75);
  padding: 12px 14px;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 0.94rem;
  outline: none;
}
.kp-field:focus {
  border-color: var(--accent);
}
.kp-textarea {
  min-height: 100px;
  resize: vertical;
}
.kp-toggle-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.kp-pill-option {
  border: var(--rule);
  padding: 9px 12px;
  background: var(--surface);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.kp-radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: var(--rule);
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kp-radio-fill {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
}

/* Select */
.kp-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: var(--rule);
  background: rgba(255,255,255,0.75);
  padding: 12px 14px;
  font-family: 'Zen Kaku Gothic New', sans-serif;
  font-size: 0.94rem;
  cursor: pointer;
}
.kp-select-content {
  background: var(--surface);
  border: var(--rule);
  box-shadow: var(--shadow);
  padding: 4px;
  z-index: 200;
}
.kp-select-item {
  padding: 10px 14px;
  font-size: 0.9rem;
  cursor: pointer;
  outline: none;
  font-family: 'Zen Kaku Gothic New', sans-serif;
}
.kp-select-item[data-highlighted] {
  background: var(--accent-soft);
}

/* Tooltip */
.kp-tooltip {
  padding: 8px 12px;
  background: var(--ink);
  color: var(--surface);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  z-index: 200;
}
.kp-tooltip-arrow { fill: var(--ink); }

/* Footer */
.kp-footer {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  border-top: var(--rule);
  padding: 12px 18px 18px;
  background: rgba(255,255,255,0.62);
  position: relative;
  z-index: 1;
}
.kp-footer-cell {
  border-top: var(--rule);
  padding-top: 8px;
  min-height: 52px;
}
.kp-footer-cell p {
  font-size: 0.88rem;
  color: var(--muted);
  margin-top: 4px;
}

/* Responsive */
@media (max-width: 1199px) {
  .kp { padding: 16px; }
  .kp-topbar { grid-template-columns: 1fr; }
  .kp-banner { grid-template-columns: 90px 1fr; }
  .kp-side-facts { grid-column: 1 / -1; }
  .kp-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); }
  .kp-hero { grid-column: span 5; }
  .kp-feature, .kp-list-panel, .kp-tall-slice { grid-column: span 3; }
  .kp-note-panel { grid-column: span 3; }
  .kp-wide-culture { grid-column: span 5; }
  .kp-form-panel, .kp-quote-panel, .kp-archive-panel { grid-column: span 4; }
  .kp-footer { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 699px) {
  .kp { padding: 10px; }
  .kp-page { box-shadow: none; }
  .kp-banner { grid-template-columns: 1fr; }
  .kp-section-num { border-right: none; border-bottom: var(--rule); padding-right: 0; padding-bottom: 10px; }
  .kp-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 12px; }
  .kp-hero, .kp-feature, .kp-note-panel, .kp-wide-culture,
  .kp-tall-slice, .kp-list-panel, .kp-form-panel,
  .kp-quote-panel, .kp-archive-panel { grid-column: 1 / -1; min-height: auto; }
  .kp-footer { grid-template-columns: 1fr; }
}
`;
