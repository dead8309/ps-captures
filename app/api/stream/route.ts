import type { NextRequest } from "next/server";
import { isAllowedHost, parseCookies } from "../download/route";

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return new Response("Missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (target.protocol !== "https:") {
    return new Response("Only https URLs allowed", { status: 400 });
  }
  if (!isAllowedHost(target)) {
    return new Response("Host not allowed", { status: 403 });
  }

  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const cf = cookies.get("psn_cf");
  if (!cf) {
    return new Response(
      "Missing PSN CloudFront cookie (fetch captures first)",
      { status: 401 },
    );
  }

  const upstream = await fetch(target.toString(), {
    headers: { Cookie: decodeURIComponent(cf) },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Unable to fetch file", { status: 502 });
  }

  // Handle M3U8 playlists by rewriting relative URLs
  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  if (
    contentType.includes("mpegurl") ||
    contentType.includes("m3u") ||
    target.pathname.endsWith(".m3u8")
  ) {
    const text = await upstream.text();
    const baseUrl = target.origin + target.pathname.replace(/\/[^/]*$/, "/");
    const rewritten = text
      .split("\n")
      .map((line) => {
        line = line.trim();
        if (line.startsWith("#") || line.startsWith("http") || !line) {
          return line;
        }
        const absoluteUrl = baseUrl + line;
        return `/api/stream?url=${encodeURIComponent(absoluteUrl)}`;
      })
      .join("\n");

    return new Response(rewritten, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=0, must-revalidate",
      },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=0, must-revalidate",
    },
  });
}
