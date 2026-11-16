import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import type { ReactNode } from "react";
import AppShell from "@/components/shell";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-sans",
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "دينتا برو — إدارة عيادة الأسنان",
  description: "نظام متكامل لإدارة عيادات الأسنان: المواعيد، الملفات الطبية، العلاجات والفواتير.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-sans antialiased text-ink`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
