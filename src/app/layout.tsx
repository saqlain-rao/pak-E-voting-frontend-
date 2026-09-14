import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "../components/Navbar";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pak e-Voting",
  description: "Secure, NADRA-verified electronic voting platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F4F9F6] text-slate-900">
        <Providers>
          <Navbar />
          <Toaster position="top-right" toastOptions={{ style: { background: '#fff', border: '1px solid #1d70b8', color: '#1d70b8', fontWeight: 'bold' } }} />
          <main className="flex-1 relative">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
