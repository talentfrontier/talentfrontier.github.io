import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Julikana — Your AI Marketing Employee",
  description:
    "Domo creates content, publishes everywhere, answers customers and turns conversations into revenue.",
};

const themeScript = `
try {
  const stored = localStorage.getItem("theme");
  const dark = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  if (dark) document.documentElement.classList.add("dark");
} catch {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
