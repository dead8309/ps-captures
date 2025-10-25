import {
  Headers,
  HttpApiBuilder,
  HttpMiddleware,
  HttpServer,
  HttpServerResponse,
} from "@effect/platform";
import { Effect, Layer, Option } from "effect";
import { CapturesResponse, PsnApi } from "./api";
import { PsnAuth, PsnAuthLive } from "./services/auth";
import { PsnCaptures, PsnCapturesLive } from "./services/captures";
import {
  PsnMedia,
  PsnMediaLive,
  PreviewMissingCookie,
  PreviewMissingUrl,
  StreamFetchFailed,
  StreamMissingUrl,
} from "./services/media";

function parseCookies(cookieHeader: string | undefined) {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) map.set(k, v.join("="));
  });
  return map;
}

const AuthGroupLive = HttpApiBuilder.group(PsnApi, "auth", (handlers) =>
  handlers
    .handle("authenticate", ({ payload: { npsso } }) =>
      Effect.gen(function* () {
        const psnAuth = yield* PsnAuth;
        return yield* psnAuth.authenticate(npsso);
      }),
    )
    .handle("refresh", ({ payload: { refresh_token } }) =>
      Effect.gen(function* () {
        const psnAuth = yield* PsnAuth;
        return yield* psnAuth.refresh(refresh_token);
      }),
    ),
);

const CapturesGroupLive = HttpApiBuilder.group(PsnApi, "captures", (handlers) =>
  handlers
    .handle("list", ({ headers }) =>
      Effect.gen(function* () {
        const authorization = headers.authorization;
        const captures = yield* PsnCaptures;
        const result = yield* captures.list(authorization);
        const isProduction = process.env.NODE_ENV === "production";
        const responseHeaders = Headers.fromInput({
          "Set-Cookie": [
            `psn_cf=${encodeURIComponent(result.cookie)}`,
            "Path=/",
            "HttpOnly",
            ...(isProduction ? ["Secure"] : []),
            "SameSite=Lax",
            "Max-Age=3600",
          ].join("; "),
        });
        return yield* HttpServerResponse.schemaJson(CapturesResponse)(
          { captures: result.captures },
          {
            headers: responseHeaders,
            status: 200,
          },
        ).pipe(
          Effect.catchTag("HttpBodyError", () =>
            Effect.die(new Error("Cannot parse body")),
          ),
        );
      }),
    )
    .handle("preview", ({ urlParams, request }) =>
      Effect.gen(function* () {
        const { url } = urlParams;
        if (!url) {
          return yield* new PreviewMissingUrl({
            message: "Missing url parameter",
          });
        }

        const cookieHeader = Option.getOrUndefined(
          Headers.get(request.headers, "cookie"),
        );
        const cookies = parseCookies(cookieHeader);
        const cfCookie = cookies.get("psn_cf");
        if (!cfCookie) {
          return yield* new PreviewMissingCookie({
            message: "Missing PSN CloudFront cookie",
          });
        }
        const decodedCookie = decodeURIComponent(cfCookie);

        const media = yield* PsnMedia;
        const result = yield* media.preview(url, decodedCookie);

        const responseHeaders = Headers.fromInput({
          "content-type": result.contentType,
          "cache-control": "public, max-age=3600",
        });

        return yield* HttpServerResponse.raw(
          new Uint8Array(result.arrayBuffer),
          {
            headers: responseHeaders,
            status: 200,
          },
        );
      }),
    )
    .handle("stream", ({ urlParams, request }) =>
      Effect.gen(function* () {
        const { url } = urlParams;
        if (!url) {
          return yield* new StreamMissingUrl({
            message: "Missing url parameter",
          });
        }

        const cookieHeader = Option.getOrUndefined(
          Headers.get(request.headers, "cookie"),
        );
        const cookies = parseCookies(cookieHeader);
        const cfCookie = cookies.get("psn_cf");
        if (!cfCookie) {
          return yield* new StreamFetchFailed({
            message: "Missing PSN CloudFront cookie",
          });
        }
        const decodedCookie = decodeURIComponent(cfCookie);

        const media = yield* PsnMedia;
        const result = yield* media.stream(url, decodedCookie);

        if (result.type === "text") {
          return yield* HttpServerResponse.text(result.text, {
            status: 200,
            headers: Headers.fromInput({
              "content-type": result.contentType,
              "cache-control": "private, max-age=0, must-revalidate",
            }),
          });
        } else {
          return yield* HttpServerResponse.stream(result.stream, {
            status: 200,
            headers: Headers.fromInput({
              "content-type": result.contentType,
              "cache-control": "private, max-age=0, must-revalidate",
            }),
          });
        }
      }),
    )
    .handle("download", ({ urlParams, request }) =>
      Effect.gen(function* () {
        const { url } = urlParams;
        if (!url) {
          return yield* new StreamMissingUrl({
            message: "Missing url parameter",
          });
        }

        const cookieHeader = Option.getOrUndefined(
          Headers.get(request.headers, "cookie"),
        );
        const cookies = parseCookies(cookieHeader);
        const cfCookie = cookies.get("psn_cf");
        if (!cfCookie) {
          return yield* new StreamFetchFailed({
            message: "Missing PSN CloudFront cookie",
          });
        }
        const decodedCookie = decodeURIComponent(cfCookie);

        const media = yield* PsnMedia;
        const result = yield* media.download(url, decodedCookie);

        return yield* HttpServerResponse.stream(result.stream, {
          status: 200,
          headers: Headers.fromInput({
            "content-type": result.contentType,
            "content-disposition": result.contentDisposition,
            "cache-control": "private, max-age=0, must-revalidate",
          }),
        });
      }),
    ),
);

const ApiLive = HttpApiBuilder.api(PsnApi).pipe(
  Layer.provide(AuthGroupLive),
  Layer.provide(CapturesGroupLive),
);

const middleware = Layer.mergeAll(
  HttpApiBuilder.middlewareCors(),
  HttpApiBuilder.middleware(HttpMiddleware.logger),
);

export const PsnApiHandler = Layer.empty.pipe(
  Layer.merge(middleware),
  Layer.provideMerge(ApiLive),
  Layer.provide(PsnAuthLive),
  Layer.provide(PsnCapturesLive),
  Layer.provide(PsnMediaLive),

  // Layer.provide(PsnAuthTest),
  // Layer.provide(PsnCapturesTest),
  // Layer.provide(PsnMediaTest),
  Layer.merge(HttpServer.layerContext),
  HttpApiBuilder.toWebHandler,
);
