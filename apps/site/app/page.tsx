"use client";

import dynamic from "next/dynamic";
import { InfoIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const HydroCycleApp = dynamic(() => import("../../web/src/App"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="[&_.demo-strip]:hidden">
      <div className="mx-auto flex max-w-7xl px-4 py-3">
        <Alert role="note">
          <InfoIcon />
          <AlertTitle>Hosted fixture preview</AlertTitle>
          <AlertDescription>
            Explore deterministic reference runs here. Live Cantera-backed
            simulation and file import remain available in the local
            application.
          </AlertDescription>
        </Alert>
      </div>
      <HydroCycleApp staticDemo />
    </div>
  );
}
