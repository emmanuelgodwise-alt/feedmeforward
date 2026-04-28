import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AriaLiveRegion } from "@/components/aria-live-region";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "FeedMeForward - Where Every Video Starts a Conversation",
  description: "FeedMeForward is a social media ecosystem centered around video polling. Join the community, create engaging polls, and discover what people really think.",
  keywords: ["FeedMeForward", "video polling", "social media", "polls", "community", "engagement"],
  authors: [{ name: "FeedMeForward Team" }],
  icons: {
    icon: "/fmf-logo.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FeedMeForward',
  },
  openGraph: {
    title: "FeedMeForward",
    description: "Where Every Video Starts a Conversation",
    siteName: "FeedMeForward",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ServiceWorkerRegister />
        <LanguageSwitcher />
        <AriaLiveRegion message={null} />
        {children}
        <PwaInstallPrompt />
        <Toaster />
      </body>
    </html>
  );
}
