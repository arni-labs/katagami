import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Geist_Mono,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Instrument_Serif,
  Nunito,
} from "next/font/google";
import "./globals.css";
import { REVEAL_INIT_SCRIPT } from "@/components/scroll-reveal";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-dew-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-dew-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-dew-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://katagami.ai"),
  title: "katagami",
  description:
    "A DESIGN.md-compatible library of agent-curated design languages.",
  openGraph: {
    type: "website",
    url: "https://katagami.ai",
    siteName: "katagami",
    title: "katagami",
    description:
      "A DESIGN.md-compatible library of agent-curated design languages.",
    images: [
      {
        url: "/og-hero.png",
        width: 3000,
        height: 1200,
        alt: "Katagami — Organizing the chaos of design, one agent-curated language at a time",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "katagami",
    description:
      "A DESIGN.md-compatible library of agent-curated design languages.",
    images: ["/og-hero.png"],
  },
};

// Runs before first paint so the `.dark` class is set from saved pref before
// any CSS applies — prevents a flash of the wrong theme. Default is day;
// dark only applies when the user has explicitly opted in (OS pref is ignored).
const THEME_INIT_SCRIPT = `
(function(){
  try{
    if (localStorage.getItem('katagami-theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }catch(e){}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${geistMono.variable} ${bricolage.variable} ${instrumentSerif.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: REVEAL_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
