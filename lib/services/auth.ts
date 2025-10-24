import { Effect, Layer, Schema } from "effect";

const NPSSO_TOKEN_URL =
  "https://ca.account.sony.com/api/authz/v3/oauth/authorize";
const TOKEN_URL = "https://ca.account.sony.com/api/authz/v3/oauth/token";

export const AUTH_METADATA = {
  client_id: "09515159-7237-4370-9b40-3806e67c0891",
  scope: "psn:mobile.v2.core psn:clientapp",
  redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
} as const;

export class AuthCodeFailed extends Schema.TaggedError<AuthCodeFailed>()(
  "AuthCodeFailed",
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

export const OAuthResponse = Schema.Struct({
  access_token: Schema.String,
  token_type: Schema.Literal("bearer"),
  expires_in: Schema.Number,
  scope: Schema.Literal(AUTH_METADATA.scope),
  id_token: Schema.String,
  refresh_token: Schema.String,
  refresh_token_expires_in: Schema.Number,
});

export class PsnAuth extends Effect.Service<PsnAuth>()("PsnAuth", {
  effect: Effect.gen(function* () {
    const getAuthorizationResposne = Effect.fn(function* (npsso: string) {
      const url = new URL(NPSSO_TOKEN_URL);
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", AUTH_METADATA.client_id);
      url.searchParams.set("scope", AUTH_METADATA.scope);
      url.searchParams.set("redirect_uri", AUTH_METADATA.redirect_uri);

      const response = yield* Effect.tryPromise({
        try: () =>
          fetch(url, {
            headers: {
              Cookie: `npsso=${npsso}`,
              "User-Agent": "curl/8.12.1",
            },
            redirect: "manual",
          }),
        catch: () => new NetworkError(),
      });

      if (response.status === 429) {
        return yield* new RateLimitedError();
      }

      const location = response.headers.get("location");
      if (!location) {
        return yield* new NoAuthCode();
      }

      const locationUrl = new URL(location);
      const code = locationUrl.searchParams.get("code");
      if (!code) {
        return yield* new NoAuthCode();
      }
      return code;
    });

    const exchangeAuthCodeForTokens = Effect.fn(function* (code: string) {
      const response = yield* Effect.tryPromise(() =>
        fetch(TOKEN_URL, {
          method: "POST",
          headers: {
            Authorization: `Basic ${process.env.PSN_CLIENT_TOKEN}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            code,
            grant_type: "authorization_code",
            redirect_uri: AUTH_METADATA.redirect_uri,
            token_format: "jwt",
          }).toString(),
        }),
      );

      if (response.status === 429) {
        return yield* new RateLimitedError();
      }

      if (response.status >= 300 || response.status < 200) {
        return yield* new TokenExchangeFailed();
      }
      const rawJson = yield* Effect.tryPromise(() => response.json());

      return yield* Schema.decodeUnknown(OAuthResponse)(rawJson);
    });

    const authenticate = (npsso: string) =>
      Effect.gen(function* () {
        const code = yield* getAuthorizationResposne(npsso);
        const data = yield* exchangeAuthCodeForTokens(code);

        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        };
      }).pipe(
        Effect.catchTag("ParseError", () => Effect.die("Failed to parse json")),
        Effect.catchTag("UnknownException", (e) =>
          Effect.die(`Unknown Exception occurred: ${e.cause}`),
        ),
      );

    const refresh = (refresh_token: string) =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise(() =>
          fetch(TOKEN_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${process.env.PSN_CLIENT_TOKEN}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token,
              redirect_uri: AUTH_METADATA.redirect_uri,
              token_format: "jwt",
            }).toString(),
          }),
        );

        if (response.status >= 300 || response.status < 200) {
          return yield* new RefreshFailed();
        }

        const tokenData = yield* Effect.tryPromise(() => response.json());
        const { access_token, refresh_token: new_refresh_token } =
          tokenData as {
            access_token: string;
            refresh_token: string;
          };

        if (!access_token || !new_refresh_token) {
          return yield* new RefreshFailed();
        }

        return { access_token, refresh_token: new_refresh_token };
      });

    return { authenticate, refresh };
  }),
}) {}

export const PsnAuthLive = PsnAuth.Default;

export const PsnAuthTest = Layer.mock(PsnAuth, {
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
