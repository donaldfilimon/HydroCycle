const MODEL_ORIGIN = "http://127.0.0.1:8000";

const allowedRoutes = [
  /^\/api\/v1\/health\/?$/,
  /^\/api\/v1\/model-metadata\/?$/,
  /^\/api\/v1\/simulations(?:\/[A-Za-z0-9._-]+)?\/?$/,
  /^\/api\/v1\/test-runs(?:\/[A-Za-z0-9._-]+(?:\/export)?)?\/?$/,
  /^\/api\/v1\/test-runs\/import\/?$/,
] as const;

const requestHeaderAllowlist = new Set([
  "accept",
  "content-type",
  "if-match",
  "x-request-id",
]);
const responseHeaderAllowlist = new Set([
  "cache-control",
  "content-disposition",
  "content-length",
  "content-type",
  "etag",
  "last-modified",
  "x-request-id",
]);

export function isAllowedModelPath(pathname: string): boolean {
  return allowedRoutes.some((pattern) => pattern.test(pathname));
}

function copyHeaders(source: Headers, allowlist: Set<string>): Headers {
  const headers = new Headers();
  for (const [name, value] of source) {
    if (allowlist.has(name.toLowerCase())) headers.set(name, value);
  }
  return headers;
}

export async function proxyModelRequest(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  if (!isAllowedModelPath(incoming.pathname)) {
    return Response.json(
      { detail: "Gateway route is not allowed." },
      { status: 404 },
    );
  }

  const upstream = new URL(incoming.pathname + incoming.search, MODEL_ORIGIN);
  const timeout = AbortSignal.timeout(90_000);
  const signal = AbortSignal.any([request.signal, timeout]);
  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers: copyHeaders(request.headers, requestHeaderAllowlist),
      body:
        request.method === "GET" || request.method === "HEAD"
          ? null
          : request.body,
      signal,
      redirect: "manual",
    });
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: copyHeaders(response.headers, responseHeaderAllowlist),
    });
  } catch (error) {
    const aborted = signal.aborted;
    return Response.json(
      {
        detail: aborted
          ? "Local model request timed out or was cancelled."
          : "Local model service is unavailable.",
      },
      { status: aborted ? 504 : 502 },
    );
  }
}
