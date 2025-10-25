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
import {
  PreviewFetchFailed,
  PreviewMissingCookie,
  PreviewMissingUrl,
  StreamFetchFailed,
  StreamMissingUrl,
} from "./services/media";

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
      )
      .add(
        HttpApiEndpoint.get("stream", "/captures/stream")
          .setUrlParams(Schema.Struct({ url: Schema.String }))
          .addSuccess(Schema.Any) // Returns either string for M3U8 or stream for video
          .addError(StreamMissingUrl)
          .addError(StreamFetchFailed),
      )
      .add(
        HttpApiEndpoint.get("download", "/captures/download")
          .setUrlParams(Schema.Struct({ url: Schema.String }))
          .addSuccess(Schema.Any) // Returns stream for download
          .addError(StreamMissingUrl)
          .addError(StreamFetchFailed),
      ),
  )
  .prefix("/api") {}
