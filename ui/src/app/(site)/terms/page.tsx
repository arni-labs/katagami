import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, List, Section } from "@/components/legal-page";
import { GOVERNING_LAW, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of service · Katagami",
  description: "The terms for using Katagami, its library and its MCP servers.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <Section title="Acceptance of these terms">
        <p>
          Katagami, the website at katagami.ai and its MCP servers, is operated by {OPERATOR} (&quot;we&quot;). By using
          it you agree to these terms. If you do not agree, do not use Katagami. Katagami is for people aged 13 and
          older.
        </p>
      </Section>

      <Section title="The service">
        <p>
          Katagami is a curated library of visual styles (design languages, palette systems and art styles) that people
          and their AI agents can browse, search, apply and check work against. Part of the library is open without an
          account, and the rest requires Google sign-in.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          Accounts use Google sign-in. You are responsible for activity under your account, including activity by any
          agent you connect, and you can revoke an agent at any time from{" "}
          <Link href="/account/agents" className="ink-underline">your account settings</Link>.
        </p>
      </Section>

      <Section title="Your license to use the library">
        <p>
          You may use the design languages, palettes, art styles, tokens and DESIGN.md files you get from Katagami in
          your own work, including commercial work. You may not republish the library, or a substantial part of it, as a
          collection of your own, or present it as your own curation.
        </p>
        <p>
          A style describes a look. It gives you no rights in other people&apos;s work, and you are responsible for what
          you make with it and how you use it.
        </p>
      </Section>

      <Section title="Content you submit">
        <p>
          You keep the rights you have in styles, images and other material you submit. By submitting, you give{" "}
          {OPERATOR} a worldwide, non-exclusive, royalty-free, sublicensable license to host, process (including with
          automated and AI tools), adapt, publish and distribute it through Katagami, and to let people who use Katagami
          use and adapt it as these terms allow.
        </p>
        <p>By submitting, you confirm that:</p>
        <List
          items={[
            "You have the rights to everything you submit, including any source images.",
            "A style you submit describes a tradition or a look, and does not imitate or target a living artist.",
            "Nothing you submit is unlawful or infringes anyone else's rights.",
          ]}
        />
        <p>We review submissions before we publish them, and we may decline, edit for display or remove any submission.</p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            "Circumvent the sign-in, usage limits or rate limits.",
            "Scrape or bulk-download the library, or load the service beyond normal use.",
            "Use Katagami to break the law or to infringe anyone's rights.",
            "Try to disrupt, probe or gain unauthorized access to the service or its infrastructure.",
          ]}
        />
      </Section>

      <Section title="Copyright complaints">
        <p>
          If you believe material on Katagami infringes your copyright, contact us <Contact /> with the material&apos;s
          link, a description of the work you own and your contact details. We will review the complaint and remove the
          material if it infringes.
        </p>
      </Section>

      <Section title="AI-generated results">
        <p>
          Parts of Katagami use AI models to suggest styles and check pages. Their results can be wrong. Use your own
          judgment before relying on them.
        </p>
      </Section>

      <Section title="Disclaimer of warranties">
        <p>
          Katagami is provided &quot;as is&quot; and &quot;as available&quot;. We do not promise that it will be
          uninterrupted, error-free or suitable for any particular purpose, and we may change or discontinue any part of
          it.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the extent the law allows, {OPERATOR} is not liable for indirect, incidental or consequential losses, or for
          lost profits or data, arising from your use of Katagami. Katagami is free to use, and our total liability to you
          for any claim is limited to US$100.
        </p>
      </Section>

      <Section title="Indemnification">
        <p>
          You agree to indemnify {OPERATOR} against claims, losses and costs arising from content you submit or from your
          breach of these terms.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          You can stop using Katagami at any time and ask us to delete your account. We may suspend or end access for
          anyone who breaks these terms or puts the service or its users at risk.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms. When we do, we post them here and update the date at the top. If you keep using
          Katagami after a change takes effect, the new terms apply.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of {GOVERNING_LAW}, and disputes will be resolved in the state or federal
          courts located in New Jersey.
        </p>
      </Section>

      <Section title="General">
        <p>
          These terms and the <Link href="/privacy" className="ink-underline">privacy policy</Link> are the whole
          agreement between you and us about Katagami. If any part of these terms is found unenforceable, the rest stays
          in effect. If we do not enforce a term, we have not waived it.
        </p>
      </Section>

      <Section title="Contact us">
        <p>For questions about these terms, contact us <Contact />.</p>
      </Section>
    </LegalPage>
  );
}
