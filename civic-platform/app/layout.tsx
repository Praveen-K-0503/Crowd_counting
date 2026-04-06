import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Civic Platform",
  description: "Crowdsourced civic issue reporting and resolution system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
