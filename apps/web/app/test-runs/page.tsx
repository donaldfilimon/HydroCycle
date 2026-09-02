import type { Metadata } from "next";

import { TestRunsPage } from "../../src/features/test-runs/test-runs-page";

export const metadata: Metadata = { title: "Test Runs" };

export default function Page() {
  return <TestRunsPage />;
}
