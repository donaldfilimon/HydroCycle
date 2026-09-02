import type { Metadata } from "next";

import { SummaryPage } from "../../src/features/summary/summary-page";

export const metadata: Metadata = { title: "Summary" };

export default function Page() {
  return <SummaryPage />;
}
