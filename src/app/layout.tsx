import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Hustle From Home · Recruiting workspace",
  description:
    "Your conversations, qualified leads, and next great hires. One connected workspace.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
