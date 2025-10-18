import type { NextRequest } from "next/server"

function parseCookies(cookieHeader: string | null) {
  const map = new Map<string, string>()
  if (!cookieHeader) return map
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=")
    if (k) map.set(k, v.join("="))
  })
  return map
}

function isAllowedHost(url: URL) {
  // Restrict to known media/CDN hosts to reduce abuse.
  const host = url.hostname.toLowerCase()
  return host.includes("cloudfront") || host.endsWith(".playstation.com") || host.includes("media.playstation.com")
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url")
  if (!urlParam) {
    return new Response("Missing url", { status: 400 })
  }

  let target: URL
  try {
    target = new URL(urlParam)
  } catch {
    return new Response("Invalid url", { status: 400 })
  }

  if (target.protocol !== "https:") {
    return new Response("Only https URLs allowed", { status: 400 })
  }
  if (!isAllowedHost(target)) {
    return new Response("Host not allowed", { status: 403 })
  }

  const cookieHeader = req.headers.get("cookie")
  const cookies = parseCookies(cookieHeader)
  const cf = cookies.get("psn_cf")
  if (!cf) {
    return new Response("Missing PSN CloudFront cookie (fetch captures first)", { status: 401 })
  }

  // Stream file through our server with CloudFront cookies
  const upstream = await fetch(target.toString(), {
    headers: { Cookie: decodeURIComponent(cf) },
  })

  if (!upstream.ok || !upstream.body) {
    return new Response("Unable to fetch file", { status: 502 })
  }

  // Try to preserve filename/type
  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream"
  const disposition =
    upstream.headers.get("content-disposition") ??
    `attachment; filename="${encodeURIComponent(target.pathname.split("/").pop() || "capture")}"`

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": disposition,
      "cache-control": "private, max-age=0, must-revalidate",
    },
  })
}
