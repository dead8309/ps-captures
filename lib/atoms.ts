import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import { BrowserKeyValueStore } from "@effect/platform-browser";
import { Atom, AtomHttpApi } from "@effect-atom/atom-react";
import { Cause, Effect, Layer, Schema } from "effect";
import { PsnApi } from "./api";

export class PsnClient extends AtomHttpApi.Tag<PsnClient>()("PsnClient", {
  api: PsnApi,
  httpClient: FetchHttpClient.layer,
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
}) {}

const runtime = Atom.runtime(
  Layer.mergeAll(BrowserKeyValueStore.layerLocalStorage, PsnClient.layer),
);

export const npssoAtom = Atom.kvs({
  runtime: runtime,
  key: "psn_npsso",
  schema: Schema.String,
  defaultValue: () => "",
});

export const accessTokenAtom = Atom.kvs({
  runtime: runtime,
  key: "psn_access",
  schema: Schema.String,
  defaultValue: () => "",
});

export const refreshTokenAtom = Atom.kvs({
  runtime: runtime,
  key: "psn_refresh",
  schema: Schema.String,
  defaultValue: () => "",
});

export const authAtom = runtime.fn(
  Effect.fnUntraced(function* ({ npsso }: { npsso: string }) {
    const client = yield* PsnClient;
    const result = yield* client.auth.authenticate({ payload: { npsso } });

    yield* Atom.set(npssoAtom, npsso);
    yield* Atom.set(accessTokenAtom, result.access_token);
    yield* Atom.set(refreshTokenAtom, result.refresh_token);
    return result;
  }),
);

export const refreshTokenFn = (refreshToken: string) =>
  Effect.gen(function* () {
    const client = yield* PsnClient;
    return yield* client.auth
      .refresh({ payload: { refresh_token: refreshToken } })
      .pipe(Effect.catchAll((error) => Effect.fail(Cause.fail(error))));
  });

export const capturesAtom = runtime.atom(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const token = get(accessTokenAtom);
    if (!token) {
      return { captures: [] };
    }

    const refreshToken = get(refreshTokenAtom);
    const client = yield* PsnClient;

    return yield* Effect.catchAll(
      client.captures.list({ headers: { authorization: token } }),
      (error) => {
        const shouldRetry = refreshToken && error._tag === "InvalidToken";

        if (shouldRetry) {
          return Effect.gen(function* () {
            const newTokens = yield* refreshTokenFn(refreshToken);
            yield* Atom.set(accessTokenAtom, newTokens.access_token);
            yield* Atom.set(refreshTokenAtom, newTokens.refresh_token);

            return yield* client.captures.list({
              headers: { authorization: newTokens.access_token },
            });
          });
        } else {
          return Effect.fail(error);
        }
      },
    );
  }),
);
