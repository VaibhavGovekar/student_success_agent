import type { Metadata } from "next";
import "./globals.css";
import Nav from "../components/Nav";

export const metadata: Metadata = {
  title: "Student Success Agent",
  description: "Tasks, internships and weekly planning in one place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0f1220]">
        <Nav />
        {children}
      </body>
    </html>
  );
}