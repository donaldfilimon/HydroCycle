import type { Metadata } from "next";
import { TwinPage } from "../../src/features/twin/twin-page";
export const metadata: Metadata = { title: "Digital Twin" };
export default function Page() {
  return <TwinPage />;
}
