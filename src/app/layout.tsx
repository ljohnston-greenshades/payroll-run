import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payroll Runner",
  description: "How long can you keep payroll running?",
  robots: { index: false, follow: false },
  icons: {
    icon: "/payroll-runner-favicon.png",
    shortcut: "/payroll-runner-favicon.png",
    apple: "/payroll-runner-favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gsNavy text-white font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
