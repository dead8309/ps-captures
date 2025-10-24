import { Effect, Layer, Schema } from "effect";

export class PreviewFetchFailed extends Schema.TaggedError<PreviewFetchFailed>()(
  "PreviewFetchFailed",
  {
    status: Schema.Number,
    message: Schema.String,
  },
) {}

export class PsnMedia extends Effect.Service<PsnMedia>()("PsnMedia", {
  effect: Effect.gen(function* () {
    const preview = (url: string, cloudFrontCookie: string) =>
      Effect.gen(function* () {
        const res = yield* Effect.tryPromise({
          try: () =>
            fetch(url, {
              headers: {
                Cookie: cloudFrontCookie,
              },
              redirect: "follow",
            }),
          catch: (err) =>
            new PreviewFetchFailed({
              status: 500,
              message: `Fetch error: ${err}`,
            }),
        });

        if (!res.ok) {
          return yield* new PreviewFetchFailed({
            status: res.status,
            message: `Failed to fetch preview: ${res.status}`,
          });
        }

        const arrayBuffer = yield* Effect.tryPromise({
          try: () => res.arrayBuffer(),
          catch: (err) =>
            new PreviewFetchFailed({
              status: 500,
              message: `Read error: ${err}`,
            }),
        });

        const contentType = res.headers.get("content-type") || "image/jpeg";
        return { arrayBuffer, contentType };
      });

    return { preview };
  }),
}) {}

export const PsnMediaLive = PsnMedia.Default;

export const PsnMediaTest = Layer.mock(PsnMedia, {
  _tag: "PsnMedia",
  preview: (_url: string, _cookie: string) =>
    Effect.succeed({
      arrayBuffer: new ArrayBuffer(0),
      contentType: "image/jpeg",
    }),
});
