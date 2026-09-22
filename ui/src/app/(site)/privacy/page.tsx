import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, List, Section } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy · Katagami",
  description: "What Katagami collects, why, who else handles it, and how to have it removed.",
};

// Written from what the code actually does, not from a template: every claim
// below was traced to the sign-in, telemetry, MCP and model-call code on
// 2026-09-22. If one of those changes (a new processor, session replay turned
// on, a new field stored), this page must change with it.

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <Section title="In short">
        <p>
          Katagami is operated by {OPERATOR}. You can browse the library without an account. If you sign in, we keep your
          Google account&apos;s name, email address and picture so we know who you are. We measure how the site is used
          so we can fix it, and some features send your words to a model provider to be judged. We don&apos;t sell your
          data and we don&apos;t show ads.
        </p>
      </Section>

      <Section title="When you sign in">
        <p>
          Sign-in uses Google. From your Google account we receive your account identifier, email address (which must be
          verified), name and profile picture. We store these in your account record, refreshed each time you sign in, along
          with your role on the site.
        </p>
        <p>
          A cookie keeps you signed in for up to 30 days, and a few short-lived cookies carry the sign-in itself for ten
          minutes. Signing out clears them.
        </p>
      </Section>

      <Section title="When you connect an agent">
        <p>
          If you connect an AI agent to Katagami through its MCP server, we record the agent client (its name and
          redirect address), the access it was granted, and when it was used. Access tokens expire after 15 minutes;
          refresh tokens last until you revoke them. You can revoke any agent, or sign out everywhere, from{" "}
          <Link href="/account/agents" className="ink-underline">Account → Agents &amp; access</Link>.
        </p>
        <p>
          The no-sign-in address, <code>katagami.ai/mcp/open</code>, collects no account data. Like the rest of the site,
          it uses your IP address for about a minute to limit how many requests one caller can make.
        </p>
      </Section>

      <Section title="How we measure the site">
        <p>
          We use Datadog to see how the site is used and where it breaks: pages viewed, clicks, load times, errors. Text
          you type into forms is masked, and session recording is off. Datadog sets its own cookie to group one visit
          together.
        </p>
        <p>
          When you search, the first 100 characters of the search go to Datadog so we can see what people look for. If
          you are signed in, site events carry a pseudonymous identifier derived from your account rather than your
          name or email. That identifier is not anonymous: we can match it back to your account.
        </p>
        <p>
          Our servers log which features were used and how long they took. For the library-judging features we log
          timings and counts, never what you asked.
        </p>
      </Section>

      <Section title="What you type into the judging features">
        <p>
          Some features send your words to Typesafe, whose Jev model judges them against the library:
        </p>
        <List
          items={[
            "Ask the library: the sentence you describe your product with, and any change you ask for afterwards.",
            "Checking a page against a design language: the page's HTML and CSS source you submit.",
            "The command bar on the explore page: what you type into it.",
          ]}
        />
        <p>Don&apos;t put anything private into these features, and don&apos;t submit a page that contains personal data.</p>
      </Section>

      <Section title="What you contribute">
        <p>
          Styles you submit, and remixes you save, are recorded with your account identifier and email address so they
          are attributed to you. Once a curator publishes a style it is public, including its images. Answers to the
          feedback form are stored with your account identifier if you were signed in when you sent them.
        </p>
      </Section>

      <Section title="Stored in your browser">
        <p>
          Some preferences stay in your own browser and never reach us unless a feature sends them: your light or dark
          theme, a shortlist you build on the explore page, and picks and notes on some comparison pages.
        </p>
      </Section>

      <Section title="Who else handles your data">
        <p>These services run Katagami for us and process data only to do that:</p>
        <List
          items={[
            "Google: sign-in.",
            "Vercel: hosts the site and keeps request logs.",
            "Railway: runs the backend that stores the library and account records, with Turso for the database and Cloudflare R2 for files.",
            "Cloudflare: DNS, and serving published images.",
            "Datadog: site measurement and server logs.",
            "Typesafe: judges the text you enter into the features listed above.",
            "OpenAI and Modal: the curator agents that review and prepare contributed styles.",
          ]}
        />
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account record and contributions until you ask us to remove them. Revoked agent grants are kept as
          a record that access was withdrawn. Logs and measurement data are kept for as long as each provider above
          retains them.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can use most of Katagami without signing in. You can revoke agents and sign out everywhere yourself. To see
          what we hold about you, correct it, or have your account and contributions deleted, contact us through{" "}
          <Contact />. We will respond within 30 days.
        </p>
      </Section>

      <Section title="Children">
        <p>Katagami is not meant for children under 13, and we don&apos;t knowingly collect their data.</p>
      </Section>

      <Section title="Changes">
        <p>
          When this policy changes, we update it here and change the date at the top. If a change affects what we do
          with data you have already given us, we will say so on the site before it takes effect.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy or your data: <Contact />.
        </p>
      </Section>
    </LegalPage>
  );
}
