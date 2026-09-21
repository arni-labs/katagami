import type { Metadata } from "next";
import { Marker } from "@/components/page-hero";
import { CopyButton } from "@/components/copy-button";

export const metadata: Metadata = {
  title: "MCP — Katagami",
  description:
    "One URL that gives any MCP client — Claude Code, Cursor, VS Code, Claude Desktop, Grok — live read access to the Katagami design commons.",
};

// The whole page. Every client asks for this and nothing else; the per-client
// command or JSON block is only this string in that client's own syntax, which
// the client's own setup screen (or the agent the visitor already has open)
// already knows.
const MCP_URL = "https://katagami.ai/mcp";

// The one press on the page, so it is sized to be pressed rather than noticed:
// the explore screen's solid ink block, in the house's mono-uppercase label
// voice. The base layer drops the transition under prefers-reduced-motion.
const COPY_BUTTON =
  "inline-flex min-w-[15rem] cursor-pointer items-center justify-center bg-foreground px-7 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-background shadow-[0_2px_0_rgba(30,35,45,0.18)] transition-transform duration-200 hover:-translate-y-[2px]";

export default function ConnectPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-12 sm:pb-20 sm:pt-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        MCP · Streamable HTTP
      </p>
      <h1 className="mt-5 font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[58px]">
        Give your agent the <Marker color="yuzu">library</Marker>.
      </h1>
      <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
        Design languages, palettes and art styles, read live by anything that
        speaks MCP.
      </p>

      <section
        className="mt-12 px-6 pb-7 pt-6 sm:mt-14 sm:px-8 sm:pb-8 sm:pt-7"
        style={{
          background: "color-mix(in srgb, var(--ramune) 5%, var(--paper-tint-base))",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Server URL
        </h2>
        <code className="mt-4 block break-all font-mono text-[20px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[32px]">
          {MCP_URL}
        </code>
        <div className="mt-7">
          <CopyButton
            text={MCP_URL}
            label="Copy server URL"
            className={COPY_BUTTON}
            artifact="mcp-url"
          />
        </div>
      </section>

      <p className="mt-8 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
        Paste it wherever your client adds an MCP server, or hand it to the agent
        you already have open. It asks you to sign in with Google once, and only
        ever reads.
      </p>
    </div>
  );
}
