import type { NextRequest } from "next/server"

const BASE = "https://m.np.playstation.com/api/gameMediaService/v2/c2s/category/cloudMediaGallery/ugcType/all"

function buildAuthHeader(req: NextRequest) {
  const useEnv = req.nextUrl.searchParams.get("useEnv") === "1"
  let raw = req.headers.get("authorization")?.trim() || ""
  if (!raw && useEnv && process.env.PSN_TOKEN) {
    raw = process.env.PSN_TOKEN.trim()
  }
  if (!raw) return null

  // normalize: accept either "Bearer token" or raw token
  const token = /^bearer\s+/i.test(raw) ? raw.replace(/^bearer\s+/i, "").trim() : raw
  return `Bearer ${token}`
}

export async function GET(req: NextRequest) {
  const authHeader = buildAuthHeader(req)
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Bearer token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }

  const requestedTokenized = req.nextUrl.searchParams.get("tokenized") !== "0"
  const makeUrl = (tokenized: boolean) => `${BASE}?includeTokenizedUrls=${tokenized ? "true" : "false"}&limit=100`

    console.log(authHeader)
  const tryFetch = async (tokenized: boolean) => {
    const url = makeUrl(tokenized)
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader,
      },
      redirect: "follow",
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.log("[v0] PSN fetch failed:", res.status, body) 
      return { ok: false as const, res, body }
    }
    return { ok: true as const, res, body: "" }
  }

  // First attempt
  let attempt = await tryFetch(requestedTokenized)

  // If scope error with tokenized, try without tokenized to still list items
  if (
    !attempt.ok &&
    attempt.res.status === 403 &&
    /Invalid PSN scope/i.test(attempt.body || "") &&
    requestedTokenized
  ) {
    const retry = await tryFetch(false)
    if (retry.ok) {
      attempt = retry
    } else {
      return new Response(
        JSON.stringify({
          error:
            "Your PSN access token appears to be missing Media Gallery permissions. Please generate a Bearer token from the PlayStation App NPSSO flow.",
          status: 401,
          psnBody: retry.body || attempt.body,
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      )
    }
  }

  if (!attempt.ok) {
    return new Response(JSON.stringify({ error: "PSN fetch failed", status: attempt.res.status, body: attempt.body }), {
      status: 502,
      headers: { "content-type": "application/json" },
    })
  }

  const upstream = attempt.res

  // Collect CloudFront cookies for downloads
  // @ts-expect-error - getSetCookie may exist at runtime
  const setCookieHeaders: string[] = upstream.headers.getSetCookie?.() ?? []
  const single = upstream.headers.get("set-cookie")
  const all = [...setCookieHeaders, ...(single ? [single] : [])]
  const cloudfrontCookies = all
    .filter((c) => /^CloudFront/i.test(c))
    .map((c) => c.split(";")[0])
    .join("; ")

  const data = await upstream.json()

  // Build response
  const headers = new Headers({ "content-type": "application/json" })
  if (cloudfrontCookies) {
    headers.append(
      "set-cookie",
      [
        `psn_cf=${encodeURIComponent(cloudfrontCookies)}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Max-Age=3600",
      ].join("; "),
    )
  }
  const finalUsedTokenized = /\bincludeTokenizedUrls=true\b/.test(upstream.url)
  headers.set("x-psn-tokenized-supported", finalUsedTokenized ? "true" : "false")

  const captures = Array.isArray(data?.ugcDocument)
    ? data.ugcDocument.map((d: any) => ({
        id: d.id,
        title: d.title ?? d.sceTitleName ?? "Capture",
        game: d.sceTitleName ?? null,
        fileType: d.fileType ?? null,
        preview: d.largePreviewImage ?? d.thumbnailUrl ?? null,
        downloadUrl: d.downloadUrl ?? null,
        createdAt: d.captureDate ?? d.creationTimestamp ?? null,
        duration: d.videoDuration ?? null,
        titleImageUrl: d.titleImageUrl ?? null,
        ugcType: d.ugcType ?? null,
        titleImageUrl: d.titleImageUrl ?? null,
      }))
    : []

  return new Response(JSON.stringify({ captures }), { status: 200, headers })
}
