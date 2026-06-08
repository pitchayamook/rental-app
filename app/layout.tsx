import type { Metadata, Viewport } from "next";
import { Sarabun, IBM_Plex_Mono } from "next/font/google";
import { SWRegister } from "@/components/sw-register";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyRoom — ระบบจัดการหอพัก",
  description: "จัดการห้องเช่า มิเตอร์น้ำ-ไฟ การชำระเงิน และใบแจ้งค่าเช่า",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MyRoom" },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
