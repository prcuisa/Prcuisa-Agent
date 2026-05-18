import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
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
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
