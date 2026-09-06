import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

import { StoreProvider } from "@/components/marketplace/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Spotter — Find Personal Trainers Near You",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL("https://training-seven-taupe.vercel.app"),
  openGraph: {
    title: "Spotter — Find Personal Trainers Near You",
    description: siteConfig.description,
    siteName: "Spotter",
    type: "website",
    images: [
      {
        url: "/images/coaching.webp",
        width: 1672,
        height: 941,
        alt: "Personal training, made personal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spotter — Find Personal Trainers Near You",
    description: siteConfig.description,
    images: ["/images/coaching.webp"],
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <StoreProvider>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <Navbar />
          <main id="main-content" className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
