import type { Metadata } from "next";
import { Geist } from "next/font/google";
import DemoBar from "@/components/DemoBar";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Laundry desk | Demo",
  description: "Order management for laundromats, with SMS updates and a live tracking page for customers.",
  robots: { index: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <DemoBar />
        {children}
      </body>
    </html>
  );
}
