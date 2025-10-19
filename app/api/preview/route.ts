import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Get the CloudFront cookie from the request
  const cfCookie = req.cookies.get("psn_cf")?.value;
  if (!cfCookie) {
    return new Response("Missing PSN CloudFront cookie", { status: 401 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        Cookie: cfCookie,
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return new Response(`Failed to fetch preview: ${res.status}`, {
        status: res.status,
      });
    }

    // Return the image with appropriate headers
    const headers = new Headers();
    headers.set(
      "content-type",
      res.headers.get("content-type") || "image/jpeg",
    );
    headers.set("cache-control", "public, max-age=3600"); // Cache for 1 hour

    return new Response(res.body, { status: 200, headers });
  } catch (err) {
    console.error("Preview fetch error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
