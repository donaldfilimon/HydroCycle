import type { Metadata } from "next";
import { headers } from "next/headers";

import "./globals.css";
import "../../web/src/styles.css";

const title = "HydroCycle";
const description = "Evidence-gated hydrogen–water engine simulation";
const fallbackOrigin = "https://hydrocycle-simulator.underswitch.chatgpt.site";

function trustedOrigin(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.toLowerCase();
  const hostname = host.replace(/:\d+$/, "");
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://${host}`;
  }
  if (
    hostname === "chatgpt-team.site" ||
    hostname.endsWith(".chatgpt-team.site") ||
    hostname === "chatgpt.site" ||
    hostname.endsWith(".chatgpt.site") ||
    hostname === "openai.site" ||
    hostname.endsWith(".openai.site")
  ) {
    return `https://${host}`;
  }
  return null;
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const origin = trustedOrigin(requestHeaders.get("host")) ?? fallbackOrigin;
  const image = new URL("/og.png", origin).toString();

  return {
    title,
    description,
    icons: {
      icon: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      title,
      description,
      images: [
        {
          url: image,
          width: 1731,
          height: 909,
          alt: "HydroCycle evidence-gated hydrogen–water engine simulation",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
