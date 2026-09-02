"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { SummaryPage } from "../src/features/summary/summary-page";

const legacyViews: Record<string, string> = {
  summary: "/summary",
  workbench: "/workbench",
  "test-runs": "/test-runs",
};

function LegacyEntry() {
  const router = useRouter();
  const search = useSearchParams();
  useEffect(() => {
    const view = search.get("view");
    const destination = view ? legacyViews[view] : "/summary";
    if (destination) router.replace(destination);
  }, [router, search]);
  return <SummaryPage />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<SummaryPage />}>
      <LegacyEntry />
    </Suspense>
  );
}
