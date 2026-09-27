import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UniSeV",
  description: "Student-powered marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}