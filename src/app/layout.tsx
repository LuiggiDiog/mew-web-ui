import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sileo";
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
  title: "Mew WebUI",
  description: "Private AI workspace",
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
