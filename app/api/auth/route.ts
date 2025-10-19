import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_URL =
  "https://ca.account.sony.com/api/authz/v3/oauth/authorize?access_type=offline&client_id=09515159-7237-4370-9b40-3806e67c0891&response_type=code&scope=psn:mobile.v2.core%20psn:clientapp&redirect_uri=com.scee.psxandroid.scecompcall://redirect";
const TOKEN_URL = "https://ca.account.sony.com/api/authz/v3/oauth/token";

const tokenOptions = {
  redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
  grant_type: "authorization_code",
  token_format: "jwt",
} as const;

export async function POST(request: NextRequest) {
  const { npsso } = await request.json();

  if (!npsso) {
    return NextResponse.json(
      { error: "NPSSO token required" },
      { status: 400 },
    );
  }

  try {
    const authResponse = await fetch(AUTH_URL, {
      headers: {
        Cookie: `npsso=${npsso}`,
      },
      redirect: "manual",
    });

    if (!authResponse.ok && authResponse.status !== 302) {
      throw new Error("Failed to get authorization code");
    }

    const location = authResponse.headers.get("location");
    if (!location) {
      throw new Error("No redirect location");
    }

    const url = new URL(location);
    const code = url.searchParams.get("code");
    if (!code) {
      throw new Error("No authorization code in redirect");
    }

    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${process.env.PSN_CLIENT_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        ...tokenOptions,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for tokens");
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    if (!access_token || !refresh_token) {
      throw new Error("Missing tokens in response");
    }

    return NextResponse.json({ access_token, refresh_token });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}
