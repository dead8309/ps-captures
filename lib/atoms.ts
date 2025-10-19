import { Atom, AtomHttpApi } from "@effect-atom/atom-react";
import { Effect, Schema } from "effect";
import { BrowserKeyValueStore } from "@effect/platform-browser";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import { PsnApi } from "./api";

export const storageRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage);

export const npssoAtom = Atom.kvs({
  runtime: storageRuntime,
  key: "psn_npsso",
  schema: Schema.String,
  defaultValue: () => "",
});

export const accessTokenAtom = Atom.kvs({
  runtime: storageRuntime,
  key: "psn_access",
  schema: Schema.String,
  defaultValue: () => "",
});

export const refreshTokenAtom = Atom.kvs({
  runtime: storageRuntime,
  key: "psn_refresh",
  schema: Schema.String,
  defaultValue: () => "",
});

export class PsnClient extends AtomHttpApi.Tag<PsnClient>()("PsnClient", {
  api: PsnApi,
  httpClient: FetchHttpClient.layer,
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
}) {}

export const authAtom = PsnClient.mutation("auth", "authenticate");

export const refreshTokenFn = (refreshToken: string) => Effect.gen(function* () {
  const client = yield* PsnClient;
  return yield* client.auth.refresh({ payload: { refresh_token: refreshToken } }).pipe(
    Effect.catchAll(error => Effect.fail(Cause.fail(error)))
  );
});

export const capturesAtom = Atom.make(
  Effect.fnUntraced(function* (get: Atom.Context) {
    const token = get(accessTokenAtom);
    if (!token) {
      return { captures: [], tokenizedSupported: false };
    }

    const refreshToken = get(refreshTokenAtom);
    const client = yield* PsnClient;

    return yield* Effect.catchAll(
      client.captures.list({ headers: { Authorization: `Bearer ${token}` } }),
      (error) => {
        const shouldRetry = refreshToken && (
          error._tag === "InvalidScope" ||
          (error._tag === "PsnFetchFailed" && error.status === 401)
        );

        if (shouldRetry) {
          return Effect.gen(function* () {
            const newTokens = yield* refreshTokenFn(refreshToken);
            yield* Atom.set(accessTokenAtom, newTokens.access_token);
            yield* Atom.set(refreshTokenAtom, newTokens.refresh_token);

            return yield* client.captures.list({ headers: { Authorization: `Bearer ${newTokens.access_token}` } });
          });
        } else {
          return Effect.fail(error);
        }
      }
    );
  })
);
