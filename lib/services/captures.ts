import { Effect, Layer, Schema } from "effect";
import { PsnCapturesResponseSchema } from "../psn";

const PSN_BASE_URL =
  "https://m.np.playstation.com/api/gameMediaService/v2/c2s/category/cloudMediaGallery/ugcType/all";

export class CapturesFetchFailed extends Schema.TaggedError<CapturesFetchFailed>()(
  "CapturesFetchFailed",
  {},
) {}

export class InvalidToken extends Schema.TaggedError<InvalidToken>()(
  "InvalidToken",
  {},
) {}

export class CapturesNetworkError extends Schema.TaggedError<CapturesNetworkError>()(
  "CapturesNetworkError",
  {},
) {}

export class CapturesParseError extends Schema.TaggedError<CapturesParseError>()(
  "CapturesParseError",
  {},
) {}

const makeUrl = (tokenized: boolean) => {
  const url = new URL(PSN_BASE_URL);
  url.searchParams.set("includeTokenizedUrls", tokenized ? "true" : "false");
  url.searchParams.set("limit", "100");
  return url;
};

export class PsnCaptures extends Effect.Service<PsnCaptures>()("PsnCaptures", {
  effect: Effect.gen(function* () {
    const list = (accessToken: string) =>
      Effect.gen(function* () {
        const tryFetch = (tokenized: boolean) =>
          Effect.gen(function* () {
            const response = yield* Effect.tryPromise(() =>
              fetch(makeUrl(tokenized), {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }),
            );

            const cookieHeaders = response.headers.getSetCookie() ?? [];
            const cloudfrontCookies = cookieHeaders
              .filter((c) => /^CloudFront/i.test(c))
              .map((c) => c.split(";")[0])
              .join("; ");

            if (response.status === 403) {
              const text = yield* Effect.tryPromise(() => response.text());
              const error = /Invalid PSN scope/i.test(text)
                ? new InvalidToken()
                : new CapturesFetchFailed();
              return yield* Effect.fail({
                ...error,
                cookie: cloudfrontCookies,
              });
            } else if (response.status >= 400) {
              return yield* Effect.fail(new CapturesFetchFailed());
            } else {
              const data = yield* Effect.tryPromise(() => response.json());
              return { data, cookie: cloudfrontCookies };
            }
          });

        const result = yield* tryFetch(true).pipe(
          Effect.catchTag("InvalidToken", (failed) => {
            return tryFetch(false).pipe(
              Effect.map((success) => ({
                ...success,
                cookie: failed.cookie || success.cookie,
              })),
            );
          }),
        );

        const parsed = yield* Schema.decodeUnknown(PsnCapturesResponseSchema)(
          result.data,
        ).pipe(
          Effect.catchTag("ParseError", () =>
            Effect.fail(new CapturesParseError()),
          ),
        );
        return {
          captures: parsed.captures,
          cookie: result.cookie,
        };
      }).pipe(
        Effect.catchTag("UnknownException", (e) =>
          Effect.die(`Unknown Exception occurred: ${e.cause}`),
        ),
      );

    return { list };
  }),
}) {}

export const PsnCapturesLive = PsnCaptures.Default;

export const PsnCapturesTest = Layer.mock(PsnCaptures, {
  _tag: "PsnCaptures",
  list: (_token: string) => Effect.succeed({ captures: [], cookie: "" }),
});
