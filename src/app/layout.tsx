import { ThemeScript } from "@/components/arena/theme-toggle";
import { connection } from "next/server";
import type { Metadata } from "next";
import { ArenaShell } from "@/components/arena/shell";
import "@fontsource-variable/inter";
import "@fontsource/silkscreen/400.css";
import "./globals.css";
import "./trajectory.css";
import "./chat-ui.css";

export const metadata: Metadata = {
  title: "TIMELY Arena",
  description: "A space to compare intelligence.",
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return <html lang="en" suppressHydrationWarning><head><ThemeScript /></head><body><ArenaShell>{children}</ArenaShell></body></html>;
}
