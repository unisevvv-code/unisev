import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UniSeV | Student-Powered Marketplace",
  description:
    "UniSeV connects students and clients through a marketplace for tasks, services, and opportunities.",
  metadataBase: new URL("https://unisev.vercel.app"),
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "UniSeV | Student-Powered Marketplace",
    description:
      "UniSeV connects students and clients through a marketplace for tasks, services, and opportunities.",
    url: "https://unisev.vercel.app",
    siteName: "UniSeV",
    type: "website",
  },
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