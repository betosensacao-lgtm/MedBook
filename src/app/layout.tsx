import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "@/styles/globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@/components/Analytics";
import { RealtimeDashboard } from "@/components/realtime-dashboard";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://med-book-eight-xi.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "MedBook — Intelligent Care for Clinics",
    template: "%s | MedBook",
  },
  description:
    "AI chatbot for clinics. Schedule appointments, answer questions, and support patients 24/7 via WhatsApp and web chat.",
  keywords: [
    "chatbot for clinics",
    "online scheduling",
    "healthcare artificial intelligence",
    "WhatsApp clinic",
    "software for clinics",
  ],
  authors: [{ name: "MedBook" }],
  creator: "MedBook",
  publisher: "MedBook",
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "MedBook",
    title: "MedBook — Intelligent Care for Clinics",
    description:
      "AI chatbot that schedules appointments, answers questions, and supports patients 24/7 via WhatsApp.",
    url: baseUrl,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MedBook",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MedBook — Intelligent Care for Clinics",
    description:
      "AI chatbot that schedules appointments, answers questions, and supports patients 24/7.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
        <RealtimeDashboard />
      </body>
    </html>
  );
}
