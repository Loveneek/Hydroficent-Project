import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavTabs from "@/components/NavTabs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hydroficient Pilot Dashboard",
  description: "Water usage analytics for the Hydroficient HYDROLOGIC pilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <div className="max-w-5xl mx-auto w-full px-8 pt-10">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Hydroficient Pilot Dashboard</h1>
          <p className="text-sm text-neutral-500 mb-6">
            Water usage analytics — Pfaff Audi Newmarket pilot
          </p>
          <NavTabs />
        </div>
        <main className="max-w-5xl mx-auto w-full px-8 pb-16 flex-1">{children}</main>
      </body>
    </html>
  );
}