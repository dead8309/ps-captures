import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpBody from "@effect/platform/HttpBody";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import { Effect, Layer, Schema } from "effect";

const AUTH_URL =
  "https://ca.account.sony.com/api/authz/v3/oauth/authorize?access_type=offline&client_id=09515159-7237-4370-9b40-3806e67c0891&response_type=code&scope=psn:mobile.v2.core%20psn:clientapp&redirect_uri=com.scee.psxandroid.scecompcall://redirect";
const TOKEN_URL = "https://ca.account.sony.com/api/authz/v3/oauth/token";

const tokenOptions = {
  redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
  token_format: "jwt",
} as const;

export class AuthCodeFailed extends Schema.TaggedError<AuthCodeFailed>()(
  "AuthCodeFailed",
  {},
) {}
export class NoRedirect extends Schema.TaggedError<NoRedirect>()(
  "NoRedirect",
  {},
) {}
export class NoAuthCode extends Schema.TaggedError<NoAuthCode>()(
  "NoAuthCode",
  {},
) {}
export class TokenExchangeFailed extends Schema.TaggedError<TokenExchangeFailed>()(
  "TokenExchangeFailed",
  {},
) {}
export class MissingTokens extends Schema.TaggedError<MissingTokens>()(
  "MissingTokens",
  {},
) {}
export class RefreshFailed extends Schema.TaggedError<RefreshFailed>()(
  "RefreshFailed",
  {},
) {}
export class NetworkError extends Schema.TaggedError<NetworkError>()(
  "NetworkError",
  {},
) {}
// TODO: make it http client specific
export class RateLimitedError extends Schema.TaggedError<RateLimitedError>()(
  "RateLimitedError",
  {},
) {}

const ManualRedirectClient = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, { redirect: "manual" as const }),
  ),
);

export class PsnAuth extends Effect.Service<PsnAuth>()("PsnAuth", {
  effect: Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;

    const authenticate = (npsso: string) =>
      Effect.gen(function* () {
        // First fetch: get authorization code
        const authRequest = HttpClientRequest.get(AUTH_URL).pipe(
          HttpClientRequest.setHeader("Cookie", `npsso=${npsso}`),
        );

        const authResponse = yield* client.execute(authRequest);

        if (authResponse.status !== 302) {
          return yield* new AuthCodeFailed();
        }

        const location = authResponse.headers.location;
        if (!location) {
          return yield* new NoRedirect();
        }

        const url = new URL(location);
        const code = url.searchParams.get("code");
        if (!code) {
          return yield* new NoAuthCode();
        }

        // Second fetch: exchange code for tokens
        const tokenRequest = HttpClientRequest.post(TOKEN_URL).pipe(
          HttpClientRequest.setHeader(
            "Authorization",
            `Basic ${process.env.PSN_CLIENT_TOKEN}`,
          ),
          HttpClientRequest.setHeader(
            "Content-Type",
            "application/x-www-form-urlencoded",
          ),
          HttpClientRequest.setBody(
            HttpBody.text(
              new URLSearchParams({
                code,
                grant_type: "authorization_code",
                redirect_uri: tokenOptions.redirect_uri,
                token_format: tokenOptions.token_format,
              }).toString(),
            ),
          ),
        );

        const tokenResponse = yield* client.execute(tokenRequest);

        if (tokenResponse.status === 429) {
          return yield* new RateLimitedError();
        }

        if (tokenResponse.status >= 300 || tokenResponse.status < 200) {
          return yield* new TokenExchangeFailed();
        }

        const tokenData = yield* tokenResponse.json;
        const { access_token, refresh_token } = tokenData as {
          access_token: string;
          refresh_token: string;
        };

        if (!access_token || !refresh_token) {
          return yield* new MissingTokens();
        }

        return { access_token, refresh_token } as const;
      }).pipe(
        Effect.catchTag("RequestError", () => Effect.fail(new NetworkError())),
        Effect.catchTag("ResponseError", () => Effect.fail(new NetworkError())),
      );

    const refresh = (refresh_token: string) =>
      Effect.gen(function* () {
        // Refresh tokens using refresh token
        const refreshRequest = HttpClientRequest.post(TOKEN_URL).pipe(
          HttpClientRequest.setHeader(
            "Authorization",
            `Basic ${process.env.PSN_CLIENT_TOKEN}`,
          ),
          HttpClientRequest.setHeader(
            "Content-Type",
            "application/x-www-form-urlencoded",
          ),
          HttpClientRequest.setBody(
            HttpBody.text(
              new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token,
                redirect_uri: tokenOptions.redirect_uri,
                token_format: tokenOptions.token_format,
              }).toString(),
            ),
          ),
        );

        const refreshResponse = yield* client.execute(refreshRequest);

        if (refreshResponse.status >= 300 || refreshResponse.status < 200) {
          return yield* new RefreshFailed();
        }

        const tokenData = yield* refreshResponse.json;
        const { access_token, refresh_token: new_refresh_token } =
          tokenData as {
            access_token: string;
            refresh_token: string;
          };

        if (!access_token || !new_refresh_token) {
          return yield* new RefreshFailed();
        }

        return { access_token, refresh_token: new_refresh_token };
      }).pipe(
        Effect.catchTag("RequestError", () => Effect.fail(new RefreshFailed())),
        Effect.catchTag("ResponseError", () =>
          Effect.fail(new RefreshFailed()),
        ),
      );

    return { authenticate, refresh };
  }),
  dependencies: [ManualRedirectClient],
}) {}

export const PsnAuthLive = PsnAuth.Default;

export const PsnAuthMock = Layer.mock(PsnAuth, {
  _tag: "PsnAuth",
  authenticate: (npsso: string) =>
    Effect.succeed({
      access_token: `fake_access_${npsso.slice(0, 10)}`,
      refresh_token: `fake_refresh_${npsso.slice(0, 10)}`,
    }),
  refresh: (refreshToken: string) =>
    Effect.succeed({
      access_token: `refreshed_access_${refreshToken.slice(0, 10)}`,
      refresh_token: `refreshed_refresh_${refreshToken.slice(0, 10)}`,
    }),
});
