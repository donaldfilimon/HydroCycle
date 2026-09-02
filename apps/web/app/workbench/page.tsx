import type { Metadata } from "next";

import { WorkbenchPage } from "../../src/features/workbench/workbench-page";

export const metadata: Metadata = { title: "Workbench" };

export default function Page() {
  return <WorkbenchPage />;
}
