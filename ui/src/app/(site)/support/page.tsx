import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, List, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Support · Katagami",
  description: "Get help with Katagami, its MCP server, your account, or a style.",
};

export default function SupportPage() {
  return (
    <LegalPage title="Support" updated={false}>
      <Section title="Connecting an agent">
        <p>
          <Link href="/connect" className="ink-underline">The MCP page</Link> has the server address and the setup for
          each client. Two addresses:
        </p>
        <List
          items={[
            <>
              <code>https://katagami.ai/mcp</code>: sign in with Google once for the full library.
            </>,
            <>
              <code>https://katagami.ai/mcp/open</code>: no sign-in, and the same styles a signed-out visitor sees.
            </>,
          ]}
        />
        <p>
          If your agent says it can&apos;t reach Katagami, ask it to call <code>whoami</code>: that says which of the two
          it is connected to.
        </p>
      </Section>

      <Section title="Your account and agents">
        <p>
          Revoke a connected agent, or sign out everywhere, from{" "}
          <Link href="/account/agents" className="ink-underline">Account → Agents &amp; access</Link>. To see, correct or
          delete what we hold about you, contact us as the{" "}
          <Link href="/privacy" className="ink-underline">privacy policy</Link> describes.
        </p>
      </Section>

      <Section title="A problem with a style">
        <p>
          If a style is broken, credits someone wrongly, or shouldn&apos;t be in the library, tell us which one and what
          is wrong. Include its link.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Anything else, whether a bug, a question or an idea: <Contact />. We read everything.
        </p>
      </Section>
    </LegalPage>
  );
}
