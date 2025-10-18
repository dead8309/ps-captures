import { NextRequest, NextResponse } from "next/server";

const TOKEN_URL = "https://ca.account.sony.com/api/authz/v3/oauth/token";

export async function POST(request: NextRequest) {
  const { refresh_token } = await request.json();

  if (!refresh_token) {
    return NextResponse.json(
      { error: "Refresh token required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${process.env.PSN_CLIENT_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token,
        grant_type: "refresh_token",
        token_format: "jwt",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const tokenData = await response.json();
    const { access_token, refresh_token: new_refresh_token } = tokenData;

    if (!access_token) {
      throw new Error("Missing access token in response");
    }

    return NextResponse.json({
      access_token,
      refresh_token: new_refresh_token,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 },
    );
  }
}
