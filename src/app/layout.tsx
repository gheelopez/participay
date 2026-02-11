import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fontSF = localFont({
  src: [
    {
      path: "./fonts/SF_Light.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/SF_Medium.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-primary",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ParticiPay",
  description: "Research participation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${fontSF.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
