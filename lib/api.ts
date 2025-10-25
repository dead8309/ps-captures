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
  StreamFetchFailed,
} from "./services/media";

export const AuthResponse = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.String,
});

export const CapturesResponse = Schema.Struct({
  captures: Schema.Array(CaptureSchema),
});

const NonEmptyString = Schema.String.pipe(Schema.nonEmptyString());

export class PsnApi extends HttpApi.make("psn")
  .add(
    HttpApiGroup.make("auth")
      .add(
        HttpApiEndpoint.post("authenticate", "/auth/authenticate")
          .setPayload(Schema.Struct({ npsso: NonEmptyString }))
          .addSuccess(AuthResponse)
          .addError(AuthCodeFailed)
          .addError(NoAuthCode)
          .addError(TokenExchangeFailed)
          .addError(NetworkError)
          .addError(RateLimitedError),
      )
      .add(
        HttpApiEndpoint.post("refresh", "/auth/refresh")
          .setPayload(Schema.Struct({ refresh_token: NonEmptyString }))
          .addSuccess(AuthResponse)
          .addError(RefreshFailed),
      ),
  )
  .add(
    HttpApiGroup.make("captures")
      .add(
        HttpApiEndpoint.get("list", "/captures")
          .setHeaders(Schema.Struct({ authorization: NonEmptyString }))
          .addSuccess(CapturesResponse)
          .addError(CapturesFetchFailed)
          .addError(InvalidToken)
          .addError(CapturesNetworkError)
          .addError(CapturesParseError),
      )
      .add(
        HttpApiEndpoint.get("preview", "/captures/preview")
          .setUrlParams(Schema.Struct({ url: Schema.URL }))
          .addSuccess(Schema.Uint8Array)
          .addError(PreviewMissingCookie)
          .addError(PreviewFetchFailed),
      )
      .add(
        HttpApiEndpoint.get("stream", "/captures/stream")
          .setUrlParams(Schema.Struct({ url: Schema.URL }))
          .addSuccess(Schema.Any) // Returns either string for M3U8 or stream for video
          .addError(StreamFetchFailed),
      )
      .add(
        HttpApiEndpoint.get("download", "/captures/download")
          .setUrlParams(Schema.Struct({ url: Schema.URL }))
          .addSuccess(Schema.Any) // Returns stream for download
          .addError(StreamFetchFailed),
      ),
  )
  .prefix("/api") {}
