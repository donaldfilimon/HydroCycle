import {
  chunkedObjectResponse,
  generateLocalAdvisorAnswer,
  parseAdvisorRequest,
} from "./advisor";
import { proxyModelRequest } from "./proxy";

export const GATEWAY_HOST = "127.0.0.1";
export const GATEWAY_PORT = 8_787;

export async function handleGatewayRequest(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/advisor" && request.method === "POST") {
    try {
      const context = parseAdvisorRequest(await request.text());
      const answer = await generateLocalAdvisorAnswer(context, request.signal);
      return chunkedObjectResponse(answer);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Local advisor request failed.";
      const validationFailure = /context|schema|JSON|128 KiB|question/i.test(
        message,
      );
      return Response.json(
        {
          detail: validationFailure
            ? message
            : "Local advisor could not produce a policy-valid answer.",
        },
        {
          status: validationFailure ? 400 : 502,
          headers: { "cache-control": "no-store" },
        },
      );
    }
  }
  if (url.pathname === "/advisor") {
    return Response.json({ detail: "Method not allowed." }, { status: 405 });
  }
  return proxyModelRequest(request);
}

if (import.meta.main) {
  Bun.serve({
    hostname: GATEWAY_HOST,
    port: GATEWAY_PORT,
    fetch: handleGatewayRequest,
  });
  process.stdout.write(
    `HydroCycle gateway listening on http://${GATEWAY_HOST}:${GATEWAY_PORT}\n`,
  );
}
