import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import "./law.css";
import "./talk.css";
import "./check.css";
import "./seal.css";
import "./voice.css";
import "./quality.css";
import "./home.css";
import "./help.css";

// One friendly, rounded font for headings and text, like the airline-style look the product follows.
const display = DM_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sandhi — speak it, sign it",
  description:
    "Quick legal help, contract drafting and contract checking in Indian law. Spoken or typed, one question at a time, every answer cites the law.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef3fb",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
