import type { Metadata, Viewport } from "next";
import { Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Site URL used to build absolute URLs for OG / Twitter previews. Set
// NEXT_PUBLIC_SITE_URL on Vercel once the production domain is wired up;
// localhost is the safe dev fallback (Next will warn otherwise).
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const description =
  "A whimsical, no-sign-up scheduler. Pick your waddle windows, watch the squad line up in realtime, and waddle off to your meeting together.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SyncQuest — Round up the squad for the next great expedition",
    template: "%s · SyncQuest",
  },
  description,
  applicationName: "SyncQuest",
  keywords: [
    "scheduler",
    "group scheduling",
    "meeting planner",
    "timezone",
    "availability",
    "no signup",
  ],
  authors: [{ name: "SyncQuest" }],
  openGraph: {
    type: "website",
    siteName: "SyncQuest",
    title: "SyncQuest — Round up the squad for the next great expedition",
    description,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SyncQuest — Round up the squad for the next great expedition",
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FFFBEB",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/40">
        {children}
      </body>
    </html>
  );
}
