import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { CaptureSchema } from "./psn";
import {
  AuthCodeFailed,
  NetworkError,
  NoAuthCode,
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
import { PreviewFetchFailed } from "./services/media";

// Preview errors
export class PreviewMissingUrl extends Schema.TaggedError<PreviewMissingUrl>()(
  "PreviewMissingUrl",
  {
    message: Schema.String,
  },
) {}

export class PreviewMissingCookie extends Schema.TaggedError<PreviewMissingCookie>()(
  "PreviewMissingCookie",
  {
    message: Schema.String,
  },
) {}

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
          .addError(NoAuthCode)
          .addError(TokenExchangeFailed)
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
    HttpApiGroup.make("captures")
      .add(
        HttpApiEndpoint.get("list", "/captures")
          .setHeaders(Schema.Struct({ authorization: Schema.String }))
          .addSuccess(CapturesResponse)
          .addError(CapturesFetchFailed)
          .addError(InvalidToken)
          .addError(CapturesNetworkError)
          .addError(CapturesParseError),
      )
      .add(
        HttpApiEndpoint.get("preview", "/captures/preview")
          .setUrlParams(Schema.Struct({ url: Schema.String }))
          .addSuccess(Schema.Uint8Array)
          .addError(PreviewMissingUrl)
          .addError(PreviewMissingCookie)
          .addError(PreviewFetchFailed),
      ),
  )
  .prefix("/api") {}
