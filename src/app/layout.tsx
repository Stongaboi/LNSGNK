import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppNav } from "@/components/app-nav";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Giggles & Kurls",
  description: "Check in, track your loyalty and grab rewards at Giggles & Kurls nail salon.",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Giggles & Kurls", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#EC4899",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${nunito.variable} antialiased`}>
        <AuthProvider>
          <div className="pb-20">{children}</div>
          <AppNav />
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
