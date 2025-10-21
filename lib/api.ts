import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { CaptureSchema } from "./psn";
import {
  AuthCodeFailed,
  MissingTokens,
  NetworkError,
  NoAuthCode,
  NoRedirect,
  RateLimitedError,
  RefreshFailed,
  TokenExchangeFailed,
} from "./services/auth";
import {
  CapturesFetchFailed,
  CapturesNetworkError,
  CapturesParseError,
  InvalidToken,
} from "./services/captures";

// Define schemas
export const AuthResponse = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.String,
});

export const CapturesResponse = Schema.Struct({
  captures: Schema.Array(CaptureSchema),
});

export class PsnApi extends HttpApi.make("psn")
  .add(
    HttpApiGroup.make("auth")
      .add(
        HttpApiEndpoint.post("authenticate", "/auth/authenticate")
          .setPayload(Schema.Struct({ npsso: Schema.String }))
          .addSuccess(AuthResponse)
          .addError(AuthCodeFailed)
          .addError(NoRedirect)
          .addError(NoAuthCode)
          .addError(TokenExchangeFailed)
          .addError(MissingTokens)
          .addError(NetworkError)
          .addError(RateLimitedError),
      )
      .add(
        HttpApiEndpoint.post("refresh", "/auth/refresh")
          .setPayload(Schema.Struct({ refresh_token: Schema.String }))
          .addSuccess(AuthResponse)
          .addError(RefreshFailed),
      ),
  )
  .add(
    HttpApiGroup.make("captures").add(
      HttpApiEndpoint.get("list", "/captures")
        .setHeaders(Schema.Struct({ authorization: Schema.String }))
        .addSuccess(CapturesResponse)
        .addError(CapturesFetchFailed)
        .addError(InvalidToken)
        .addError(CapturesNetworkError)
        .addError(CapturesParseError),
    ),
  )
  .prefix("/api") {}
