import type { Metadata } from "next";
import localFont from "next/font/local";
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
    "Privacy-first Schengen visa application guidance, document review, and official PDF preparation.",
  openGraph: {
    title: "VisaPilot",
    description:
      "High-privacy Schengen visa application support with secure workflows and official form preparation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background text-foreground">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-hero-grid opacity-15 [mask-image:linear-gradient(to_bottom,white,white,transparent)]" />
          <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-brand-cyan/10 blur-[140px]" />
          <div className="pointer-events-none absolute right-0 top-12 h-72 w-72 rounded-full bg-amber-200/5 blur-[140px]" />
          <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
            <Navbar />
            <main className="flex-1 py-10 sm:py-14">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
