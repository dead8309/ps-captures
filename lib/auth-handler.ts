import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as HttpMiddleware from "@effect/platform/HttpMiddleware";
import * as HttpServer from "@effect/platform/HttpServer";
import { Effect, Layer } from "effect";
import { PsnApi, PsnFetchFailed } from "./api";
import { PsnAuth, PsnAuthLive } from "./services/auth";

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
).pipe(Layer.provide(PsnAuthLive));

const CapturesGroupLive = HttpApiBuilder.group(PsnApi, "captures", (handlers) =>
  handlers.handle("list", ({ headers }) =>
    Effect.gen(function* () {
      // Dummy implementation - always fail for now
      return yield* new PsnFetchFailed();
    }),
  ),
);

// Full API
const ApiLive = HttpApiBuilder.api(PsnApi).pipe(
  Layer.provide(AuthGroupLive),
  Layer.provide(CapturesGroupLive),
);

// Middleware
const middleware = Layer.mergeAll(
  HttpApiBuilder.middlewareCors(),
  HttpApiBuilder.middleware(HttpMiddleware.logger),
);

export const PsnApiHandler = Layer.empty.pipe(
  Layer.merge(middleware),
  Layer.provideMerge(ApiLive),
  Layer.merge(HttpServer.layerContext),
  HttpApiBuilder.toWebHandler,
);
