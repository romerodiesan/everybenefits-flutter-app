import type { Metadata } from "next";
import { Figtree, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["500", "600", "700", "800"],
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Pulse Studio",
  description: "Author courses and learning paths for EVERY Pulse Academy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${figtree.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
