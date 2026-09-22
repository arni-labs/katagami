import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, List, Section } from "@/components/legal-page";
import { GOVERNING_LAW, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms · Katagami",
  description: "The terms for using Katagami, its library, and its MCP server.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <Section title="The agreement">
        <p>
          Katagami, the website at katagami.ai and its MCP servers, is operated by {OPERATOR} (&quot;we&quot;). By using
          it you agree to these terms. If you don&apos;t agree, please don&apos;t use Katagami.
        </p>
      </Section>

      <Section title="What Katagami is">
        <p>
          A curated library of visual styles (design languages, palette systems and art styles) that people and their
          AI agents can browse, search, apply and check work against. Part of the library is open without an account;
          signing in with Google opens the rest.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You sign in with a Google account, and you&apos;re responsible for what happens through it, including through
          any agent you connect. You can revoke an agent at any time from{" "}
          <Link href="/account/agents" className="ink-underline">Account → Agents &amp; access</Link>.
        </p>
      </Section>

      <Section title="Using the library">
        <p>
          You may use the design languages, palettes, art styles, tokens and DESIGN.md files you get from Katagami in
          your own work, including commercial work. You may not republish the library, or a substantial part of it, as a
          collection of your own, or present it as your own curation.
        </p>
        <p>
          Styles describe a look; they don&apos;t grant rights in anything you make with them. When you generate images
          or build interfaces from a style, you are responsible for what you make and how you use it.
        </p>
      </Section>

      <Section title="What you contribute">
        <p>
          You keep the rights you have in styles, images and other material you submit. By submitting, you give{" "}
          {OPERATOR} a worldwide, non-exclusive, royalty-free licence to host, review, adapt for display, publish and
          distribute it through Katagami, including in exports, through the MCP servers and to other people who use
          the library, for as long as it is part of Katagami.
        </p>
        <p>By submitting, you confirm that:</p>
        <List
          items={[
            "you have the rights to everything you submit, including any source images;",
            "a style describes a tradition or a look, and does not imitate or target a living artist;",
            "nothing you submit is unlawful or infringes anyone else's rights.",
          ]}
        />
        <p>
          Submissions are reviewed before they are published, and we may decline, edit for display, or remove any
          submission.
        </p>
      </Section>

      <Section title="Fair use of the service">
        <p>Please don&apos;t:</p>
        <List
          items={[
            "get around the sign-in, the visitor limits or the rate limits;",
            "scrape or bulk-download the library, or load the service beyond normal use;",
            "use Katagami to break the law or to infringe anyone's rights;",
            "try to disrupt, probe or gain unauthorised access to the service or its infrastructure.",
          ]}
        />
      </Section>

      <Section title="AI features">
        <p>
          Some features use AI models to judge fit, compose kits or check pages. Their answers can be wrong: a fit score
          is a model&apos;s judgement for ranking, not a measure of quality, and a clean check doesn&apos;t mean a page
          is good. Use your own judgement before relying on them.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          Katagami is provided as it is and as available. We don&apos;t promise that it will be uninterrupted, error-free,
          or suitable for any particular purpose, and we may change or discontinue any part of it.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the extent the law allows, {OPERATOR} is not liable for indirect, incidental or consequential losses, or for
          lost profits or data, arising from your use of Katagami. Katagami is free to use, and our total liability to you
          for any claim is limited to US$100.
        </p>
      </Section>

      <Section title="Ending access">
        <p>
          You can stop using Katagami at any time and ask us to delete your account. We may suspend or end access for
          anyone who breaks these terms or puts the service or its users at risk.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms. When we do, we change them here and update the date at the top. If you keep using
          Katagami after a change takes effect, the new terms apply.
        </p>
      </Section>

      <Section title="Law">
        <p>These terms are governed by the laws of {GOVERNING_LAW}.</p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms: <Contact />. How we handle personal data is in the{" "}
          <Link href="/privacy" className="ink-underline">privacy policy</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
