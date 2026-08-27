"use client";

import dynamic from "next/dynamic";

const HydroCycleApp = dynamic(() => import("../../web/src/App"), {
  ssr: false,
});

export default function Home() {
  return <HydroCycleApp />;
}
