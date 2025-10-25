import { Url } from "@effect/platform";
import { Effect, Layer, pipe, Schema, Stream } from "effect";
import { StreamFetchFailed } from "../api";

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

    const stream = (url: string, cloudFrontCookie: string) =>
      Effect.gen(function* () {
        const upstreamResponse = yield* Effect.tryPromise({
          try: () =>
            fetch(url, {
              headers: { Cookie: cloudFrontCookie },
            }),
          catch: (error) =>
            new StreamFetchFailed({
              message: `Failed to fetch upstream: ${error}`,
            }),
        });

        if (!upstreamResponse.ok || !upstreamResponse.body) {
          return yield* new StreamFetchFailed({
            message: `Unable to fetch file: status ${upstreamResponse.status}, hasBody ${!!upstreamResponse.body}`,
          });
        }

        const contentType =
          upstreamResponse.headers.get("content-type") ??
          "application/octet-stream";

        // Handle M3U8 playlists by rewriting relative URLs
        if (
          contentType.includes("mpegurl") ||
          contentType.includes("m3u") ||
          url.endsWith(".m3u8")
        ) {
          const text = yield* Effect.tryPromise({
            try: () => upstreamResponse.text(),
            catch: (error) =>
              new StreamFetchFailed({
                message: `Failed to read text: ${error}`,
              }),
          });

          const baseUrl = yield* pipe(
            url,
            Url.fromString,
            Effect.map((u) => u.origin + u.pathname.replace(/\/[^/]*$/, "/")),
          ).pipe(Effect.orDie);

          const rewritten = text
            .split("\n")
            .map((line) => {
              line = line.trim();
              if (line.startsWith("#") || line.startsWith("http") || !line) {
                return line;
              }
              const absoluteUrl = baseUrl + line;
              return `/api/captures/stream?url=${encodeURIComponent(absoluteUrl)}`;
            })
            .join("\n");

          return {
            type: "text" as const,
            text: rewritten,
            contentType,
          };
        }

        if (!upstreamResponse.body) {
          return yield* new StreamFetchFailed({
            message: "Response body is empty",
          });
        }
        const effectStream = Stream.fromReadableStream(
          // biome-ignore lint/style/noNonNullAssertion: typehinting
          () => upstreamResponse.body!,
          (error) =>
            new StreamFetchFailed({
              message: `Stream error: ${error}`,
            }),
        );

        return {
          type: "stream" as const,
          stream: effectStream,
          contentType,
        };
      });

    return { preview, stream };
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
  stream: (_url: string, _cookie: string) =>
    Effect.succeed({
      type: "stream" as const,
      stream: Stream.empty,
      contentType: "video/mp4",
    }),
});
