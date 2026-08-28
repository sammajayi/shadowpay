import type { Metadata } from "next";
import { Outfit, Caveat } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/Header";

const openRunde = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const caveat = Caveat({
  variable: "--font-signature",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "ShadowPay Admin",
  description: "Platform aggregates only — never individual purchase data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${openRunde.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <AuthProvider>
          <Header />
          <main className="flex-1 w-full max-w-[1200px] mx-auto px-4">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
