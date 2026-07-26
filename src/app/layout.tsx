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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://medbook-amber.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "MedBook — Atendimento Inteligente para Clínicas",
    template: "%s | MedBook",
  },
  description:
    "Chatbot com IA para clínicas. Agende consultas, tire dúvidas e atende pacientes 24h via WhatsApp e chat web.",
  keywords: [
    "chatbot para clínicas",
    "agendamento online",
    "inteligência artificial saúde",
    "WhatsApp clínica",
    "software para clínicas",
  ],
  authors: [{ name: "MedBook" }],
  creator: "MedBook",
  publisher: "MedBook",
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "MedBook",
    title: "MedBook — Atendimento Inteligente para Clínicas",
    description:
      "Chatbot com IA que agenda consultas, tira dúvidas e atende pacientes 24h via WhatsApp.",
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
    title: "MedBook — Atendimento Inteligente para Clínicas",
    description:
      "Chatbot com IA que agenda consultas, tira dúvidas e atende pacientes 24h.",
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
    <html lang="pt" className={`${sora.variable} ${inter.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
        <RealtimeDashboard />
      </body>
    </html>
  );
}
