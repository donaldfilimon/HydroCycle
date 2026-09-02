import type { NextConfig } from "next";

const mode = process.env.HYDROCYCLE_WEB_MODE === "hosted" ? "hosted" : "local";
const target = process.env.HYDROCYCLE_DEPLOY_TARGET ?? "local";
const pages = mode === "hosted" && target === "pages";
const localRouting: Pick<NextConfig, "rewrites"> =
  mode === "local"
    ? {
        async rewrites() {
          return [
            {
              source: "/gateway/:path*",
              destination: "http://127.0.0.1:8787/:path*",
            },
          ];
        },
      }
    : {};

const nextConfig: NextConfig = {
  output: pages ? "export" : undefined,
  trailingSlash: pages,
  basePath: pages ? "/HydroCycle" : "",
  assetPrefix: pages ? "/HydroCycle" : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  ...localRouting,
};

export default nextConfig;
