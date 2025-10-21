import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect, Layer, Schema } from "effect";
import { PSN_BASE_URL, PsnCapturesResponseSchema } from "../psn";

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
    const client = yield* HttpClient.HttpClient;

    const list = (accessToken: string) =>
      Effect.gen(function* () {
        const tryFetch = (tokenized: boolean) =>
          Effect.gen(function* () {
            const response = yield* HttpClientRequest.get(
              makeUrl(tokenized),
            ).pipe(
              HttpClientRequest.setHeader(
                "Authorization",
                `Bearer ${accessToken}`,
              ),
              client.execute,
            );

            if (response.status === 403) {
              const text = yield* response.text;
              const error = /Invalid PSN scope/i.test(text)
                ? new InvalidToken()
                : new CapturesFetchFailed();
              return yield* Effect.fail(error);
            } else if (response.status >= 400) {
              return yield* Effect.fail(new CapturesFetchFailed());
            } else {
              return yield* response.json;
            }
          }).pipe(
            Effect.catchTags({
              RequestError: () => Effect.fail(new CapturesNetworkError()),
              ResponseError: () => Effect.fail(new CapturesNetworkError()),
            }),
          );

        const data = yield* tryFetch(true).pipe(
          Effect.catchTag("InvalidToken", () => tryFetch(false)),
        );

        return yield* Schema.decodeUnknown(PsnCapturesResponseSchema)(
          data,
        ).pipe(
          Effect.catchTag("ParseError", () =>
            Effect.fail(new CapturesParseError()),
          ),
        );
      });

    return { list };
  }),
  dependencies: [FetchHttpClient.layer],
}) {}

export const PsnCapturesLive = PsnCaptures.Default;

export const PsnCapturesTest = Layer.mock(PsnCaptures, {
  _tag: "PsnCaptures",
  list: (_token: string) => Effect.succeed({ captures: [] }),
});
