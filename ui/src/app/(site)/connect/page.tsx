import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHero, Marker } from "@/components/page-hero";
import { SectionHeading, StickyNote, WashiTape, Stamp } from "@/components/scrapbook";
import { CopyButton } from "@/components/copy-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KX_BTN_INK } from "@/lib/katagami-ui";

export const metadata: Metadata = {
  title: "Connect — Katagami",
  description:
    "Add the Katagami read-only MCP server to Claude Code, Cursor, VS Code, Claude Desktop, or any MCP client — one command or one click.",
};

// The one fact everything on this page orbits.
const MCP_URL = "https://katagami.ai/mcp";

const CLAUDE_CODE_CMD = `claude mcp add --transport http katagami ${MCP_URL}`;

const CODEX_CMD = `codex mcp add katagami --url ${MCP_URL}`;

const CODEX_TOML = `[mcp_servers.katagami]
url = "${MCP_URL}"`;

// Grok reads the same config as Claude Code — the standard mcpServers block.
// Claude-format readers skip a server that has a "url" but no "type", so it's required.
const GROK_JSON = `{
  "mcpServers": {
    "katagami": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;

const CURSOR_DEEPLINK =
  "cursor://anysphere.cursor-deeplink/mcp/install?name=katagami&config=eyJ1cmwiOiJodHRwczovL2thdGFnYW1pLmFpL21jcCJ9";

const CURSOR_JSON = `{
  "mcpServers": {
    "katagami": {
      "url": "${MCP_URL}"
    }
  }
}`;

const VSCODE_DEEPLINK =
  "vscode:mcp/install?%7B%22name%22%3A%22katagami%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fkatagami.ai%2Fmcp%22%7D";

const VSCODE_CLI = `code --add-mcp '{"name":"katagami","type":"http","url":"${MCP_URL}"}'`;

// Older Claude Desktop builds without remote connectors bridge the HTTP server
// locally as a stdio server via mcp-remote.
const CLAUDE_DESKTOP_STDIO_JSON = `{
  "mcpServers": {
    "katagami": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${MCP_URL}"]
    }
  }
}`;

// Generic typed block — the type field keeps it working in Claude-format readers.
const GENERIC_JSON = `{
  "mcpServers": {
    "katagami": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;

/** Mono code block on tinted paper — mono label + copy button above, no border. */
function CodeBlock({
  label,
  code,
  copyArtifact,
}: {
  label: string;
  code: string;
  copyArtifact: string;
}) {
  return (
    <div
      className="relative"
      style={{
        background: "color-mix(in srgb, var(--ramune) 5%, var(--paper-tint-base))",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 sm:px-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <CopyButton text={code} label="Copy" artifact={copyArtifact} />
      </div>
      <pre className="overflow-x-auto px-4 pb-4 pt-2.5 font-mono text-[13px] leading-relaxed text-foreground sm:px-5">
        {code}
      </pre>
    </div>
  );
}

/** One sentence of guidance above each tab's block(s). */
function TabNote({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-xl text-[17px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

const TAB_TRIGGER =
  "flex-none rounded-none px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground after:hidden hover:text-foreground data-active:bg-foreground data-active:text-background data-active:hover:text-background data-active:shadow-[0_1px_0_rgba(30,35,45,0.18)] sm:px-3.5 sm:tracking-[0.14em]";

export default function ConnectPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Agent access"
        eyebrowAccent="ramune"
        title={
          <>
            Connect Katagami to your <Marker color="yuzu">agent</Marker>
          </>
        }
        description="Give your coding or design agent live access to the design commons — languages, palettes, and art styles — over MCP."
      />

      {/* The server URL — the one thing to know, big and copyable. */}
      <section className="mt-10">
        <StickyNote tint="yuzu" className="p-6 sm:p-7">
          <WashiTape color="sakura" className="-top-2 left-6" />
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Server URL — Streamable HTTP
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
            <code className="break-all font-mono text-[17px] font-bold tracking-tight text-foreground sm:text-[22px]">
              {MCP_URL}
            </code>
            <CopyButton text={MCP_URL} label="Copy URL" variant="ink" artifact="mcp-url" />
          </div>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Works instantly with no login — you get a curated sample of the
            catalog. Sign in with Google for the full thing.
          </p>
        </StickyNote>
      </section>

      {/* Per-client setup — pick your tool, one command or one click. */}
      <section className="mt-12 sm:mt-14">
        <SectionHeading eyebrow="Setup" eyebrowColor="sakura">
          Pick your tool
        </SectionHeading>
        <Tabs defaultValue="claude-code">
          <TabsList className="w-full flex-wrap justify-start gap-0 rounded-none bg-card/70 p-0.5 shadow-[0_1px_2px_rgba(30,35,45,0.05),0_2px_8px_rgba(30,35,45,0.05)] group-data-horizontal/tabs:h-auto sm:w-fit">
            <TabsTrigger value="claude-code" className={TAB_TRIGGER}>
              Claude Code
            </TabsTrigger>
            <TabsTrigger value="codex" className={TAB_TRIGGER}>
              Codex
            </TabsTrigger>
            <TabsTrigger value="cursor" className={TAB_TRIGGER}>
              Cursor
            </TabsTrigger>
            <TabsTrigger value="grok" className={TAB_TRIGGER}>
              Grok
            </TabsTrigger>
            <TabsTrigger value="vscode" className={TAB_TRIGGER}>
              VS Code
            </TabsTrigger>
            <TabsTrigger value="claude-desktop" className={TAB_TRIGGER}>
              Claude Desktop
            </TabsTrigger>
            <TabsTrigger value="other" className={TAB_TRIGGER}>
              Other
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claude-code" className="mt-4 space-y-4">
            <TabNote>One command in your terminal — that&apos;s the whole setup.</TabNote>
            <CodeBlock label="Terminal" code={CLAUDE_CODE_CMD} copyArtifact="mcp-claude-code-cmd" />
          </TabsContent>

          <TabsContent value="codex" className="mt-4 space-y-4">
            <TabNote>One command, or a couple of lines in your Codex config.</TabNote>
            <CodeBlock label="Terminal" code={CODEX_CMD} copyArtifact="mcp-codex-cmd" />
            <TabNote>
              Or add it to <code className="font-mono text-[15px]">~/.codex/config.toml</code>:
            </TabNote>
            <CodeBlock label="~/.codex/config.toml" code={CODEX_TOML} copyArtifact="mcp-codex-toml" />
          </TabsContent>

          <TabsContent value="cursor" className="mt-4 space-y-4">
            <TabNote>One click installs the server straight into Cursor.</TabNote>
            <a href={CURSOR_DEEPLINK} className={KX_BTN_INK}>
              Add to Cursor
            </a>
            <TabNote>
              Or add it by hand to <code className="font-mono text-[15px]">~/.cursor/mcp.json</code>:
            </TabNote>
            <CodeBlock label="~/.cursor/mcp.json" code={CURSOR_JSON} copyArtifact="mcp-cursor-json" />
          </TabsContent>

          <TabsContent value="grok" className="mt-4 space-y-4">
            <TabNote>
              Grok reads the same MCP config as Claude Code — add Katagami once
              and it&apos;s there.
            </TabNote>
            <CodeBlock
              label="~/.claude.json or .mcp.json"
              code={GROK_JSON}
              copyArtifact="mcp-grok-json"
            />
            <TabNote>
              Then run <code className="font-mono text-[15px]">/mcps</code> inside
              Grok to enable it.
            </TabNote>
          </TabsContent>

          <TabsContent value="vscode" className="mt-4 space-y-4">
            <TabNote>One click installs the server straight into VS Code.</TabNote>
            <a href={VSCODE_DEEPLINK} className={KX_BTN_INK}>
              Add to VS Code
            </a>
            <TabNote>Or install from the command line:</TabNote>
            <CodeBlock label="Terminal" code={VSCODE_CLI} copyArtifact="mcp-vscode-cli" />
          </TabsContent>

          <TabsContent value="claude-desktop" className="mt-4 space-y-4">
            <TabNote>
              Add it as a custom connector — Settings → Connectors → Add custom
              connector — and paste the server URL, naming it{" "}
              <code className="font-mono text-[15px]">katagami</code>.
            </TabNote>
            <CodeBlock
              label="Server URL"
              code={MCP_URL}
              copyArtifact="mcp-claude-desktop-url"
            />
            <TabNote>
              Older builds without remote connectors can bridge it locally as a
              stdio server:
            </TabNote>
            <CodeBlock
              label="claude_desktop_config.json"
              code={CLAUDE_DESKTOP_STDIO_JSON}
              copyArtifact="mcp-claude-desktop-stdio-json"
            />
          </TabsContent>

          <TabsContent value="other" className="mt-4 space-y-4">
            <TabNote>
              Any MCP client that speaks Streamable HTTP can connect — point it
              at the server URL, or use the generic config block.
            </TabNote>
            <CodeBlock label="Server URL" code={MCP_URL} copyArtifact="mcp-url-other" />
            <CodeBlock label="mcp.json" code={GENERIC_JSON} copyArtifact="mcp-generic-json" />
          </TabsContent>
        </Tabs>
      </section>

      {/* Access + first steps — the two things worth knowing after connecting. */}
      <section className="mt-12 grid gap-6 sm:mt-14 sm:grid-cols-2">
        <StickyNote tint="ramune" className="p-6">
          <Stamp color="ramune" rotate={-1.5}>
            Access
          </Stamp>
          <p className="mt-4 text-[17px] leading-relaxed text-foreground">
            Connecting asks you to <strong>sign in with Google</strong>.
            OAuth-capable clients show a login card on the first handshake —
            tap, Google, done. The server advertises its authorization server
            at{" "}
            <code className="break-all font-mono text-[14px]">
              /.well-known/oauth-protected-resource
            </code>
            .
          </p>
        </StickyNote>
        <StickyNote tint="sakura" className="p-6">
          <Stamp color="sakura" rotate={-1.5}>
            First steps
          </Stamp>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[17px] leading-relaxed text-foreground">
            <li>
              Call <code className="font-mono text-[14px]">describe_catalog</code>{" "}
              first — it tells your agent what it can search by.
            </li>
            <li>
              Then reach for the{" "}
              <code className="font-mono text-[14px]">search_*</code> tools and
              drill into anything that looks right.
            </li>
          </ol>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            11 read tools cover design languages, palettes, art styles, design
            tokens, DESIGN.md export, embodiment previews, and{" "}
            <code className="font-mono text-[13px]">whoami</code>.
          </p>
        </StickyNote>
      </section>
    </div>
  );
}
