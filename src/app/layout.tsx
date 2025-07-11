import type { Metadata } from "next";
import { Geist, Geist_Mono, UnifrakturMaguntia, Press_Start_2P, VT323, Silkscreen } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const unifrakturMaguntia = UnifrakturMaguntia({
  variable: "--font-unifraktur-maguntia",
  subsets: ["latin"],
  weight: "400",
});

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start-2p",
  subsets: ["latin"],
  weight: "400",
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Doom Meeting",
  description: "Video meeting app with camera switching functionality",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} ${unifrakturMaguntia.variable} ${pressStart2P.variable} ${vt323.variable} ${silkscreen.variable} antialiased h-full`}>
        <div className="h-full">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
