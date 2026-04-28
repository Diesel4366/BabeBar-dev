import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BookingProvider } from "@/context/BookingContext";
import { BookingDrawer } from "@/components/booking/BookingDrawer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "BABEBAR | Modern Beauty Studio",
  description: "Профессиональный уход и эстетика. Запишитесь онлайн в современную студию красоты.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#FAFAFA] text-[#0A0A0A]">
        <BookingProvider>
          {children}
          <BookingDrawer />
        </BookingProvider>
      </body>
    </html>
  );
}
