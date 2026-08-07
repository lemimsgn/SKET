import type { Metadata } from "next";
import "./globals.css";
import RegisterServiceWorker from "./components/registerServiceWorker";

export const metadata: Metadata = {
  title: "Sket Learning Platform",
  description: "Learn skills, grow your network, and earn referral rewards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
