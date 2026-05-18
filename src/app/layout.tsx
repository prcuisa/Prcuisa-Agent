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
  title: "Prcuisa Labs — AI Assistant",
  description: "Asisten AI dari Prcuisa Labs. Solusi AI, Otomasi, dan Smart Systems untuk bisnis modern.",
  keywords: ["Prcuisa Labs", "AI", "Automation", "Smart Systems", "Digital Transformation", "Indonesia"],
  authors: [{ name: "Prcuisa Labs" }],
  icons: {
    icon: "https://prcuisa.com/logodark.png",
  },
  openGraph: {
    title: "Prcuisa Labs — AI Assistant",
    description: "AI Assistant dari Prcuisa Labs. Build Smarter Businesses with AI & Technology.",
    url: "https://prcuisa.com",
    siteName: "Prcuisa Labs",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prcuisa Labs — AI Assistant",
    description: "AI Assistant dari Prcuisa Labs. Build Smarter Businesses with AI & Technology.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
