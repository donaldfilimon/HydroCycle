import createClient from "openapi-fetch";

import type { paths } from "./api.generated";

/**
 * Creates the localhost-only HydroCycle API client.
 *
 * An empty base URL is intentional for the browser: Vite proxies `/api` to the
 * model service during local development. Callers may pass the explicit
 * `http://127.0.0.1:8000` origin for non-browser tests and local scripts.
 */
export function createHydroCycleClient(baseUrl = "") {
  return createClient<paths>({ baseUrl });
}

export type HydroCycleClient = ReturnType<typeof createHydroCycleClient>;
