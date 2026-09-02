import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { InstrumentShell } from "../src/components/instrument-shell";
import { runtimeConfigFromEnvironment } from "../src/lib/runtime";
import { HydroCycleProviders } from "../src/state/app-state";

const title = "HydroCycle";
const description =
  "Evidence-gated hydrogen-water engine simulation and read-only advisory";
const configuredOrigin =
  process.env.HYDROCYCLE_PUBLIC_ORIGIN ??
  "https://donaldfilimon.github.io/HydroCycle";

export const metadata: Metadata = {
  metadataBase: new URL(configuredOrigin),
  title: { default: title, template: `%s · ${title}` },
  description,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    title,
    description,
    images: [
      {
        url: "/og.svg",
        width: 1_200,
        height: 630,
        alt: "HydroCycle evidence-gated scientific instrument",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const runtime = runtimeConfigFromEnvironment();
  return (
    <html lang="en">
      <body>
        <HydroCycleProviders runtime={runtime}>
          <InstrumentShell>{children}</InstrumentShell>
        </HydroCycleProviders>
      </body>
    </html>
  );
}
