import type { Metadata } from "next";
import { Nunito, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "katagami",
  description:
    "A SPEC.md-compatible library of agent-curated design languages.",
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
      className={`${nunito.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
