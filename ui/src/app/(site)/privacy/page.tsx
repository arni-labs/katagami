import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, List, Section } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy · Katagami",
  description: "How Katagami collects, uses and shares information, and the choices you have.",
};

// Every statement below was checked against the sign-in, analytics, MCP and
// model-call code on 2026-09-22. If one of those changes (a new service
// provider, session recording turned on, a new kind of data stored), this page
// changes with it.

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <Section title="About this policy">
        <p>
          This policy explains how {OPERATOR} (&quot;we&quot;, &quot;us&quot;) collects, uses and shares information when
          you use Katagami, including the website at katagami.ai and its MCP servers (the &quot;service&quot;).
        </p>
      </Section>

      <Section title="Information you give us">
        <List
          items={[
            "Account information. When you sign in with Google, we receive your name, email address, profile picture and Google account identifier. We also store the role we assign your account.",
            "Content you submit. Styles, images and remixes you contribute, and your answers to our feedback form.",
            "Text you submit for AI evaluation. Descriptions and refinements you type into Ask the library and the explore page, and page source you submit to be checked against a design language.",
          ]}
        />
      </Section>

      <Section title="Information we collect automatically">
        <List
          items={[
            "Usage information. The pages you view, what you click, the searches you run and any errors you encounter. If you are signed in, we can link this information to your account.",
            "Device and connection information. Your browser type, device type and IP address.",
            "Connected agents. When you connect an AI agent through our MCP servers, we record which agent you connected, the access you granted it and how often it is used.",
          ]}
        />
      </Section>

      <Section title="How we use information">
        <List
          items={[
            "To provide the service, including signing you in and recording who contributed each style.",
            "To evaluate the text and page source you submit and return the results.",
            "To understand how the service is used, fix problems and improve it.",
            "To protect the service, including limiting request rates and preventing abuse.",
            "To respond to your requests and contact you about your account.",
            "To comply with legal obligations.",
          ]}
        />
      </Section>

      <Section title="How we share information">
        <p>We do not sell your personal information, and we do not use it for advertising. We share information only as follows:</p>
        <List
          items={[
            "Service providers. Companies that run parts of the service for us: Google for sign-in, Vercel and Railway (with Turso and Cloudflare R2) for hosting and data storage, Cloudflare for network and file delivery, Datadog for analytics and logs, Typesafe for AI evaluation of the text and page source you submit, and OpenAI and Modal for the AI tools that review contributed styles. We share with them only what they need to provide their services to us.",
            "Public content. Styles you contribute become visible to other users once we approve them.",
            "Legal reasons. When the law requires it, or to protect the rights and safety of our users, the public or us.",
            `Business transfers. If ${OPERATOR} is involved in a merger, acquisition or sale of assets, information may be transferred as part of that transaction.`,
          ]}
        />
      </Section>

      <Section title="Cookies and similar technologies">
        <p>
          We use cookies to keep you signed in and to understand how the service is used, and we keep some preferences,
          such as your choice of theme, in your browser. You can block or delete cookies in your browser settings, but
          you will not be able to stay signed in without them. Katagami does not respond to Do Not Track signals.
        </p>
      </Section>

      <Section title="Data retention">
        <p>
          We retain your account information and contributions while your account is active, or until you ask us to
          delete them. Styles you contributed that we have published may stay in the library after your account is
          deleted. We retain usage and log data for as long as we need it for the purposes above, and our service
          providers retain it according to their own retention periods.
        </p>
      </Section>

      <Section title="Your rights and choices">
        <p>
          Signed-in users can revoke connected agents and sign out of all sessions from{" "}
          <Link href="/account/agents" className="ink-underline">their account settings</Link>. To access, correct or
          delete your personal information, contact us <Contact />. We respond to requests within 30 days.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use reasonable technical and organizational measures to protect your information, including encrypted
          connections. No method of transmission or storage is completely secure, so we cannot guarantee absolute
          security.
        </p>
      </Section>

      <Section title="International data transfers">
        <p>
          Katagami is operated from the United States. Our service providers may process your information in the United
          States and in other countries.
        </p>
      </Section>

      <Section title="Children">
        <p>
          Katagami is not directed to children under 13, and we do not knowingly collect their personal information. If
          you believe a child has given us personal information, contact us <Contact /> and we will delete it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy. We post changes on this page and update the date at the top. If a change materially
          affects how we use information you have already given us, we will tell you on the site before it takes effect.
        </p>
      </Section>

      <Section title="Contact us">
        <p>For questions or requests about this policy or your information, contact us <Contact />.</p>
      </Section>
    </LegalPage>
  );
}
