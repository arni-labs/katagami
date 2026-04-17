"use client";

import * as Tabs from "@radix-ui/react-tabs";
import * as Progress from "@radix-ui/react-progress";
import * as Switch from "@radix-ui/react-switch";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Avatar from "@radix-ui/react-avatar";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import * as Slider from "@radix-ui/react-slider";
import { CheckIcon, ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";

export function NeoKawaiiRadix() {
  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="nk">
        <style>{styles}</style>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=JetBrains+Mono:wght@400;600&family=M+PLUS+Rounded+1c:wght@400;500;700&display=swap"
        />

        {/* Background sparkles */}
        <div className="nk-sparkles" />

        <div className="nk-shell">
          <div className="nk-shell-inner" />

          {/* Top Bar */}
          <div className="nk-topbar">
            <div className="nk-brand">
              <div className="nk-logo">N</div>
              <div>
                <span className="nk-eyebrow">workspace / v2.4</span>
                <h1 className="nk-title">Neo-Kawaii</h1>
              </div>
            </div>
            <div className="nk-topbar-actions">
              <div className="nk-search">
                <span>&#128269;</span> Search tasks...
              </div>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button className="nk-icon-pill">&#9881;</button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="nk-tooltip" sideOffset={6}>
                    Settings
                    <Tooltip.Arrow className="nk-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button className="nk-cta-pill">+ New Task</button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="nk-dialog-overlay" />
                  <Dialog.Content className="nk-dialog">
                    <Dialog.Title className="nk-dialog-title">
                      Create New Task
                    </Dialog.Title>
                    <Dialog.Description className="nk-dialog-desc">
                      Add a cute new task to your workspace.
                    </Dialog.Description>
                    <input
                      className="nk-input"
                      placeholder="What needs doing?"
                    />
                    <Select.Root defaultValue="design">
                      <Select.Trigger className="nk-select-trigger">
                        <Select.Value />
                        <Select.Icon>
                          <ChevronDownIcon />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="nk-select-content">
                          <Select.Viewport>
                            <Select.Item value="design" className="nk-select-item">
                              <Select.ItemText>Design</Select.ItemText>
                            </Select.Item>
                            <Select.Item value="dev" className="nk-select-item">
                              <Select.ItemText>Development</Select.ItemText>
                            </Select.Item>
                            <Select.Item value="research" className="nk-select-item">
                              <Select.ItemText>Research</Select.ItemText>
                            </Select.Item>
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                    <div className="nk-dialog-actions">
                      <button className="nk-cta-pill">Create &#10024;</button>
                      <Dialog.Close asChild>
                        <button className="nk-icon-pill">Cancel</button>
                      </Dialog.Close>
                    </div>
                    <Dialog.Close asChild>
                      <button className="nk-dialog-close">
                        <Cross2Icon />
                      </button>
                    </Dialog.Close>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </div>

          {/* Workspace */}
          <div className="nk-workspace">
            {/* Left Sidebar */}
            <div className="nk-sidebar">
              {/* Mascot Card */}
              <div className="nk-panel nk-mascot-card">
                <div className="nk-mascot">
                  <div className="nk-eye nk-eye-l" />
                  <div className="nk-eye nk-eye-r" />
                  <div className="nk-mouth" />
                </div>
                <p className="nk-mascot-text">
                  Hi! You have <strong>5 tasks</strong> today. Let&apos;s go!
                </p>
              </div>

              {/* Nav */}
              <div className="nk-panel nk-nav-card">
                <span className="nk-eyebrow">Navigation</span>
                <div className="nk-nav-list">
                  {["Dashboard", "Tasks", "Calendar", "Messages"].map(
                    (item, i) => (
                      <div
                        key={item}
                        className={`nk-nav-item ${i === 1 ? "active" : ""}`}
                      >
                        <span className="nk-nav-dot" />
                        {item}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="nk-panel">
                <span className="nk-eyebrow">Completion</span>
                <div className="nk-stat-number">73%</div>
                <Progress.Root className="nk-progress" value={73}>
                  <Progress.Indicator
                    className="nk-progress-fill"
                    style={{ width: "73%" }}
                  />
                </Progress.Root>
                <div className="nk-stat-row">
                  <span>Auto-assign</span>
                  <Switch.Root className="nk-switch" defaultChecked>
                    <Switch.Thumb className="nk-switch-thumb" />
                  </Switch.Root>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="nk-main">
              <div className="nk-panel">
                <Tabs.Root defaultValue="active">
                  <Tabs.List className="nk-tabs">
                    <Tabs.Trigger value="active" className="nk-tab">
                      Active
                    </Tabs.Trigger>
                    <Tabs.Trigger value="review" className="nk-tab">
                      In Review
                    </Tabs.Trigger>
                    <Tabs.Trigger value="done" className="nk-tab">
                      Done
                    </Tabs.Trigger>
                  </Tabs.List>

                  <Tabs.Content value="active" className="nk-tab-content">
                    {/* Featured Task */}
                    <div className="nk-task featured">
                      <div className="nk-task-top">
                        <div>
                          <h4>Redesign onboarding flow</h4>
                          <p>
                            Create a friendly, step-by-step wizard with mascot
                            guidance and progress candy bar.
                          </p>
                        </div>
                        <div className="nk-cute-state">
                          <span className="nk-eyes">
                            <span />
                            <span />
                          </span>
                          Active
                        </div>
                      </div>
                      <Progress.Root className="nk-progress" value={62}>
                        <Progress.Indicator
                          className="nk-progress-fill"
                          style={{ width: "62%" }}
                        />
                      </Progress.Root>
                      <div className="nk-task-meta">
                        <div className="nk-avatars">
                          <Avatar.Root className="nk-avatar">
                            <Avatar.Fallback className="nk-avatar-fb nk-av-1">
                              MK
                            </Avatar.Fallback>
                          </Avatar.Root>
                          <Avatar.Root className="nk-avatar">
                            <Avatar.Fallback className="nk-avatar-fb nk-av-2">
                              YT
                            </Avatar.Fallback>
                          </Avatar.Root>
                        </div>
                        <span className="nk-mono-chip">Due Apr 22</span>
                      </div>
                    </div>

                    {/* Regular Task */}
                    <div className="nk-task">
                      <div className="nk-task-top">
                        <div>
                          <h4>Icon set refresh</h4>
                          <p>
                            Update 48 icons to match new rounded, bubbly style
                            language.
                          </p>
                        </div>
                        <div className="nk-cute-state">
                          <span className="nk-eyes">
                            <span />
                            <span />
                          </span>
                          Pending
                        </div>
                      </div>
                      <div className="nk-checklist">
                        <label className="nk-check-row">
                          <Checkbox.Root className="nk-checkbox" defaultChecked>
                            <Checkbox.Indicator>
                              <CheckIcon />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          Navigation icons
                        </label>
                        <label className="nk-check-row">
                          <Checkbox.Root className="nk-checkbox">
                            <Checkbox.Indicator>
                              <CheckIcon />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          Action icons
                        </label>
                        <label className="nk-check-row">
                          <Checkbox.Root className="nk-checkbox">
                            <Checkbox.Indicator>
                              <CheckIcon />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          Status icons
                        </label>
                      </div>
                    </div>
                  </Tabs.Content>

                  <Tabs.Content value="review" className="nk-tab-content">
                    <div className="nk-task">
                      <h4>Color palette audit</h4>
                      <p>Verify all 12 token colors meet WCAG contrast on surfaces.</p>
                    </div>
                  </Tabs.Content>

                  <Tabs.Content value="done" className="nk-tab-content">
                    <div className="nk-task">
                      <h4>Typography scale</h4>
                      <p>1.25 ratio with Baloo 2 headings. Complete.</p>
                    </div>
                  </Tabs.Content>
                </Tabs.Root>
              </div>
            </div>

            {/* Right Panel */}
            <div className="nk-sidebar">
              <div className="nk-panel">
                <span className="nk-eyebrow">Team</span>
                <div className="nk-team-list">
                  {[
                    { name: "Miku K.", role: "Design Lead", init: "MK", c: 1 },
                    { name: "Yuki T.", role: "Engineer", init: "YT", c: 2 },
                    { name: "Aoi S.", role: "PM", init: "AS", c: 3 },
                  ].map((m) => (
                    <div key={m.init} className="nk-team-row">
                      <Avatar.Root className="nk-avatar">
                        <Avatar.Fallback
                          className={`nk-avatar-fb nk-av-${m.c}`}
                        >
                          {m.init}
                        </Avatar.Fallback>
                      </Avatar.Root>
                      <div>
                        <div className="nk-team-name">{m.name}</div>
                        <div className="nk-team-role">{m.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="nk-panel">
                <span className="nk-eyebrow">Priority</span>
                <Slider.Root
                  className="nk-slider"
                  defaultValue={[65]}
                  max={100}
                >
                  <Slider.Track className="nk-slider-track">
                    <Slider.Range className="nk-slider-range" />
                  </Slider.Track>
                  <Slider.Thumb className="nk-slider-thumb" />
                </Slider.Root>
              </div>

              <div className="nk-panel">
                <span className="nk-eyebrow">Activity</span>
                <Accordion.Root type="single" collapsible>
                  <Accordion.Item value="today" className="nk-acc-item">
                    <Accordion.Trigger className="nk-acc-trigger">
                      Today <ChevronDownIcon className="nk-acc-chevron" />
                    </Accordion.Trigger>
                    <Accordion.Content className="nk-acc-content">
                      <p>Miku updated the onboarding flow mockups.</p>
                      <p>Yuki pushed 3 commits to icon-refresh branch.</p>
                    </Accordion.Content>
                  </Accordion.Item>
                  <Accordion.Item value="yesterday" className="nk-acc-item">
                    <Accordion.Trigger className="nk-acc-trigger">
                      Yesterday <ChevronDownIcon className="nk-acc-chevron" />
                    </Accordion.Trigger>
                    <Accordion.Content className="nk-acc-content">
                      <p>Aoi created the sprint planning board.</p>
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion.Root>
              </div>

              {/* Chat bubble */}
              <div className="nk-panel nk-chat-card">
                <span className="nk-eyebrow">Quick Chat</span>
                <div className="nk-chat-bubble nk-chat-them">
                  The new palette is so cute! &#128150;
                </div>
                <div className="nk-chat-bubble nk-chat-me">
                  Right?? The gradient pills are my fav
                </div>
                <div className="nk-chat-input-row">
                  <input
                    className="nk-input nk-chat-input"
                    placeholder="Type a message..."
                  />
                  <button className="nk-send-btn">&#9829;</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}

const styles = `
.nk {
  --primary: #ff6fcf;
  --secondary: #8b7cff;
  --accent: #5ef2ff;
  --bg: #fff7fd;
  --surface: rgba(255, 249, 255, 0.72);
  --text: #34264d;
  --muted: #8f80ad;
  --border: #d9c7ff;
  --shadow-sm: 0 10px 24px rgba(255,111,207,0.12);
  --shadow-md: 0 18px 40px rgba(139,124,255,0.18);
  --shadow-lg: 0 30px 70px rgba(94,242,255,0.16);
  --radius-sm: 12px;
  --radius-md: 20px;
  --radius-lg: 32px;
  --radius-pill: 9999px;

  min-height: 100%;
  font-family: 'M PLUS Rounded 1c', sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at 10% 20%, rgba(255,111,207,0.18), transparent 20%),
    radial-gradient(circle at 80% 10%, rgba(94,242,255,0.18), transparent 22%),
    radial-gradient(circle at 85% 75%, rgba(139,124,255,0.14), transparent 20%),
    linear-gradient(180deg, #fff8fe 0%, #f7f4ff 45%, #f4fbff 100%);
  position: relative;
  padding: 32px 24px;
}
.nk::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.85) 1.3px, transparent 1.3px);
  background-size: 24px 24px;
  opacity: 0.38;
  pointer-events: none;
}
.nk-sparkles {
  position: absolute;
  width: 180px;
  height: 180px;
  top: 90px;
  left: 52%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, transparent 70%);
  opacity: 0.8;
  pointer-events: none;
}
.nk-shell {
  max-width: 1450px;
  margin: 0 auto;
  padding: 18px;
  border-radius: 40px;
  border: 2px solid rgba(217,199,255,0.9);
  background: linear-gradient(180deg, rgba(255,255,255,0.64), rgba(255,255,255,0.4));
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(28px);
  position: relative;
  overflow: hidden;
}
.nk-shell-inner {
  position: absolute;
  inset: 12px;
  border-radius: 30px;
  border: 2px solid rgba(255,255,255,0.6);
  pointer-events: none;
}

/* Topbar */
.nk-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 18px 22px;
}
.nk-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.nk-logo {
  width: 58px;
  height: 58px;
  border-radius: 24px;
  border: 2px solid rgba(255,255,255,0.9);
  background: linear-gradient(145deg, rgba(255,111,207,0.86), rgba(139,124,255,0.95));
  box-shadow: inset 0 3px 8px rgba(255,255,255,0.55), var(--shadow-sm);
  display: grid;
  place-items: center;
  color: white;
  font-family: 'Baloo 2', cursive;
  font-size: 28px;
  font-weight: 800;
}
.nk-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
  color: var(--muted);
  display: block;
  margin-bottom: 4px;
}
.nk-title {
  font-family: 'Baloo 2', cursive;
  font-size: 30px;
  line-height: 1;
}
.nk-topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nk-search, .nk-icon-pill, .nk-cta-pill, .nk-tab, .nk-send-btn {
  border-radius: var(--radius-pill);
  border: 2px solid rgba(255,255,255,0.8);
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.6), var(--shadow-sm);
  cursor: pointer;
  transition: transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms cubic-bezier(0.22,1,0.36,1);
}
.nk-search {
  min-width: 260px;
  padding: 14px 18px;
  background: rgba(255,255,255,0.72);
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.nk-icon-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 18px;
  background: rgba(255,255,255,0.72);
  color: var(--text);
  min-width: 48px;
  font-size: 16px;
}
.nk-cta-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 18px;
  background: linear-gradient(135deg, rgba(255,111,207,0.92), rgba(94,242,255,0.92));
  color: white;
  font-weight: 700;
  font-size: 14px;
}
.nk-icon-pill:hover, .nk-cta-pill:hover, .nk-tab:hover, .nk-send-btn:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.72), 0 16px 32px rgba(139,124,255,0.2);
}

/* Workspace */
.nk-workspace {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 300px;
  gap: 18px;
}
.nk-sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.nk-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.nk-panel {
  position: relative;
  border-radius: 34px;
  padding: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,248,255,0.64));
  border: 2px solid rgba(217,199,255,0.88);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(22px);
  overflow: hidden;
}

/* Mascot */
.nk-mascot-card {
  background: linear-gradient(155deg, rgba(255,111,207,0.2), rgba(139,124,255,0.18), rgba(94,242,255,0.12));
  text-align: center;
}
.nk-mascot {
  width: 110px;
  height: 110px;
  margin: 14px auto;
  position: relative;
  border-radius: 40px;
  background: linear-gradient(160deg, #fff6ff, #ffe0f4 50%, #dffbff 100%);
  border: 3px solid rgba(255,255,255,0.85);
  box-shadow: inset 0 6px 10px rgba(255,255,255,0.75), 0 18px 30px rgba(255,111,207,0.16);
  animation: nk-float 4.2s ease-in-out infinite;
}
@keyframes nk-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.nk-eye {
  position: absolute;
  top: 40px;
  width: 12px;
  height: 16px;
  border-radius: 50%;
  background: #47335f;
}
.nk-eye-l { left: 32px; }
.nk-eye-r { right: 32px; }
.nk-mouth {
  position: absolute;
  width: 30px;
  height: 18px;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  border-bottom: 3px solid var(--primary);
  border-radius: 0 0 20px 20px;
}
.nk-mascot-text {
  font-size: 14px;
  color: var(--text);
  margin-top: 8px;
}

/* Nav */
.nk-nav-list {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}
.nk-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 180ms;
}
.nk-nav-item:hover { background: rgba(255,255,255,0.6); }
.nk-nav-item.active {
  background: rgba(255,255,255,0.8);
  border: 2px solid rgba(255,255,255,0.85);
  font-weight: 700;
}
.nk-nav-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
}
.nk-nav-item.active .nk-nav-dot {
  background: var(--primary);
}

/* Stats */
.nk-stat-number {
  font-family: 'Baloo 2', cursive;
  font-size: 40px;
  line-height: 1;
  margin: 8px 0;
}
.nk-stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 13px;
}

/* Progress */
.nk-progress {
  width: 100%;
  height: 18px;
  border-radius: var(--radius-pill);
  border: 2px solid rgba(255,255,255,0.84);
  background: rgba(255,255,255,0.72);
  overflow: hidden;
}
.nk-progress-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
  transition: width 500ms cubic-bezier(0.22,1,0.36,1);
}

/* Switch */
.nk-switch {
  width: 48px;
  height: 26px;
  border-radius: var(--radius-pill);
  background: rgba(217,199,255,0.5);
  border: 2px solid rgba(255,255,255,0.8);
  position: relative;
  cursor: pointer;
  transition: background 180ms;
}
.nk-switch[data-state="checked"] {
  background: linear-gradient(90deg, var(--primary), var(--secondary));
}
.nk-switch-thumb {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: transform 180ms;
  transform: translateX(1px);
}
.nk-switch[data-state="checked"] .nk-switch-thumb {
  transform: translateX(23px);
}

/* Tabs */
.nk-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.nk-tab {
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  background: rgba(255,255,255,0.5);
  color: var(--muted);
  border: 2px solid rgba(255,255,255,0.7);
  cursor: pointer;
}
.nk-tab[data-state="active"] {
  background: linear-gradient(135deg, rgba(255,111,207,0.18), rgba(94,242,255,0.15));
  color: var(--text);
  border-color: rgba(217,199,255,0.9);
}
.nk-tab-content { outline: none; }

/* Tasks */
.nk-task {
  padding: 18px;
  border-radius: 28px;
  background: rgba(255,255,255,0.74);
  border: 2px solid rgba(255,255,255,0.84);
  box-shadow: var(--shadow-sm);
  margin-bottom: 14px;
}
.nk-task.featured {
  background: linear-gradient(145deg, rgba(255,240,250,0.96), rgba(244,251,255,0.9));
}
.nk-task-top {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.nk-task h4 {
  font-family: 'Baloo 2', cursive;
  font-size: 22px;
  line-height: 1.05;
}
.nk-task p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  margin-top: 4px;
}
.nk-cute-state {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: var(--radius-pill);
  border: 2px solid rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.84);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.nk-eyes {
  display: inline-flex;
  gap: 4px;
  padding: 5px 6px;
  border-radius: var(--radius-pill);
  background: rgba(255,111,207,0.14);
}
.nk-eyes span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #493561;
  display: block;
}
.nk-task-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
.nk-mono-chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}

/* Avatars */
.nk-avatars {
  display: flex;
  gap: -4px;
}
.nk-avatar {
  display: inline-flex;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid white;
}
.nk-avatar-fb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: white;
}
.nk-av-1 { background: linear-gradient(135deg, #ff6fcf, #8b7cff); }
.nk-av-2 { background: linear-gradient(135deg, #5ef2ff, #8b7cff); }
.nk-av-3 { background: linear-gradient(135deg, #ffbf69, #ff6fcf); }

/* Checkbox */
.nk-checklist {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.nk-check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  cursor: pointer;
}
.nk-checkbox {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 2px solid var(--border);
  background: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.nk-checkbox[data-state="checked"] {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-color: transparent;
  color: white;
}

/* Team */
.nk-team-list {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}
.nk-team-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nk-team-name { font-weight: 600; font-size: 14px; }
.nk-team-role { font-size: 12px; color: var(--muted); }

/* Slider */
.nk-slider {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 20px;
  margin-top: 12px;
}
.nk-slider-track {
  position: relative;
  flex-grow: 1;
  height: 10px;
  border-radius: var(--radius-pill);
  background: rgba(217,199,255,0.3);
  border: 2px solid rgba(255,255,255,0.7);
}
.nk-slider-range {
  position: absolute;
  height: 100%;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, var(--primary), var(--accent));
}
.nk-slider-thumb {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  border: 3px solid var(--primary);
  box-shadow: var(--shadow-sm);
}

/* Accordion */
.nk-acc-item {
  border-bottom: 1px solid rgba(217,199,255,0.4);
}
.nk-acc-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 0;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  background: none;
  border: none;
  color: var(--text);
}
.nk-acc-chevron {
  transition: transform 200ms;
}
.nk-acc-trigger[data-state="open"] .nk-acc-chevron {
  transform: rotate(180deg);
}
.nk-acc-content {
  overflow: hidden;
  font-size: 13px;
  color: var(--muted);
  padding-bottom: 12px;
}
.nk-acc-content p { margin-bottom: 6px; }

/* Chat */
.nk-chat-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.nk-chat-bubble {
  padding: 12px 16px;
  border-radius: 20px;
  font-size: 14px;
  max-width: 85%;
}
.nk-chat-them {
  background: rgba(255,255,255,0.8);
  border: 2px solid rgba(255,255,255,0.9);
  align-self: flex-start;
}
.nk-chat-me {
  background: linear-gradient(135deg, rgba(255,111,207,0.2), rgba(139,124,255,0.18));
  border: 2px solid rgba(217,199,255,0.5);
  align-self: flex-end;
}
.nk-chat-input-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.nk-input {
  flex: 1;
  padding: 12px 16px;
  border-radius: var(--radius-pill);
  border: 2px solid rgba(217,199,255,0.7);
  background: rgba(255,255,255,0.7);
  font-size: 14px;
  outline: none;
}
.nk-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255,111,207,0.15);
}
.nk-send-btn {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  font-size: 18px;
}

/* Dialog */
.nk-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255,247,253,0.8);
  backdrop-filter: blur(8px);
  z-index: 100;
}
.nk-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 101;
  width: min(480px, 90vw);
  padding: 32px;
  border-radius: 34px;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,248,255,0.92));
  border: 2px solid rgba(217,199,255,0.9);
  box-shadow: 0 30px 80px rgba(139,124,255,0.25);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.nk-dialog-title {
  font-family: 'Baloo 2', cursive;
  font-size: 24px;
}
.nk-dialog-desc {
  font-size: 14px;
  color: var(--muted);
}
.nk-dialog-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
.nk-dialog-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid rgba(217,199,255,0.5);
  background: rgba(255,255,255,0.8);
  display: grid;
  place-items: center;
  cursor: pointer;
}

/* Select */
.nk-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-pill);
  border: 2px solid rgba(217,199,255,0.7);
  background: rgba(255,255,255,0.7);
  font-size: 14px;
  cursor: pointer;
}
.nk-select-content {
  background: white;
  border-radius: 20px;
  border: 2px solid rgba(217,199,255,0.8);
  box-shadow: var(--shadow-md);
  padding: 6px;
  z-index: 200;
}
.nk-select-item {
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  cursor: pointer;
  outline: none;
}
.nk-select-item[data-highlighted] {
  background: linear-gradient(135deg, rgba(255,111,207,0.12), rgba(94,242,255,0.1));
}

/* Tooltip */
.nk-tooltip {
  padding: 8px 14px;
  border-radius: 14px;
  background: var(--text);
  color: white;
  font-size: 12px;
  font-weight: 600;
  z-index: 200;
}
.nk-tooltip-arrow { fill: var(--text); }

@media (max-width: 1024px) {
  .nk-workspace { grid-template-columns: 1fr; }
}
`;
