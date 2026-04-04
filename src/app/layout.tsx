import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FeedMeForward - Where Every Video Starts a Conversation",
  description: "FeedMeForward is a social media ecosystem centered around video polling. Join the community, create engaging polls, and discover what people really think.",
  keywords: ["FeedMeForward", "video polling", "social media", "polls", "community", "engagement"],
  authors: [{ name: "FeedMeForward Team" }],
  icons: {
    icon: "/logo.svg",
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
