import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as HttpMiddleware from "@effect/platform/HttpMiddleware";
import * as HttpServer from "@effect/platform/HttpServer";
import { Effect, Layer } from "effect";
import { PsnApi } from "./api";
import { PsnAuth, PsnAuthLive, PsnAuthTest } from "./services/auth";
import {
  PsnCaptures,
  PsnCapturesLive,
  PsnCapturesTest,
} from "./services/captures";

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
      return yield* captures.list(authorization);
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
