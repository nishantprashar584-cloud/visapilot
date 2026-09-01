import type { Metadata } from "next";
import localFont from "next/font/local";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://visapilot.app"),
  title: "VisaPilot",
  description:
    "The automated Schengen tourist visa engine for packet preparation, itinerary sync, and privacy-first document workflows.",
  openGraph: {
    title: "VisaPilot",
    description:
      "Generate Schengen tourist visa packets with secure workflows, financial audits, and itinerary-aligned document preparation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background text-foreground dark" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-hero-grid opacity-15 [mask-image:linear-gradient(to_bottom,white,white,transparent)]" />
          <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-300/18 blur-[150px]" />
          <div className="pointer-events-none absolute right-0 top-12 h-80 w-80 rounded-full bg-indigo-400/16 blur-[165px]" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300/10 blur-[160px]" />
          <div className="relative flex min-h-screen w-full flex-col">
            <Navbar />
            <main className="flex-1 w-full py-4 sm:py-8">{children}</main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
