import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sileo";
import { env } from "@/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  applicationName: "Mew WebUI",
  title: "Mew WebUI",
  description: "Private AI workspace",
  keywords: [
    "Mew WebUI",
    "AI workspace",
    "private AI",
    "self-hosted LLM UI",
    "Ollama",
    "Open source AI UI",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Mew WebUI",
    title: "Mew WebUI",
    description: "Private AI workspace",
    images: [
      {
        url: "/isotype.png",
        width: 1024,
        height: 1024,
        alt: "Mew WebUI isotype",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mew WebUI",
    description: "Private AI workspace",
    images: ["/isotype.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/isotype.svg", type: "image/svg+xml" },
      { url: "/isotype.png", type: "image/png" },
    ],
    shortcut: "/isotype.svg",
    apple: "/isotype.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: "#7B63FF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          theme="light"
          options={{ fill: "var(--color-surface-elevated)" }}
        />
      </body>
    </html>
  );
}
