import {
  Headers,
  HttpApiBuilder,
  HttpMiddleware,
  HttpServer,
  HttpServerResponse,
} from "@effect/platform";
import { Effect, Layer } from "effect";
import { PsnApi, CapturesResponse } from "./api";
import { PsnAuth, PsnAuthLive } from "./services/auth";
import { PsnCaptures, PsnCapturesLive } from "./services/captures";

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
  handlers.handle("list", ({ headers }) =>
    Effect.gen(function* () {
      const authorization = headers.authorization;
      const captures = yield* PsnCaptures;
      const result = yield* captures.list(authorization);
      const responseHeaders = Headers.fromInput({
        "Set-Cookie": [
          `psn_cf=${encodeURIComponent(result.cookie)}`,
          "Path=/",
          "HttpOnly",
          "Secure",
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

  // Layer.provide(PsnAuthTest),
  // Layer.provide(PsnCapturesTest),
  Layer.merge(HttpServer.layerContext),
  HttpApiBuilder.toWebHandler,
);
