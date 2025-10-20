import * as HttpApi from "@effect/platform/HttpApi";
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as Schema from "effect/Schema";
import {
  AuthCodeFailed,
  MissingTokens,
  NetworkError,
  NoAuthCode,
  NoRedirect,
  RefreshFailed,
  TokenExchangeFailed,
  RateLimitedError,
} from "./services/auth";

// Define schemas for Capture
const BaseCapture = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  game: Schema.NullOr(Schema.String),
  preview: Schema.NullOr(Schema.String),
  createdAt: Schema.NullOr(Schema.String),
  titleImageUrl: Schema.NullOr(Schema.String),
});

const VideoCapture = BaseCapture.pipe(
  Schema.extend(
    Schema.Struct({
      type: Schema.Literal("video"),
      duration: Schema.NullOr(Schema.Number),
      downloadUrl: Schema.NullOr(Schema.String),
      videoUrl: Schema.NullOr(Schema.String),
      ugcType: Schema.Literal(2),
    }),
  ),
);

const ImageCapture = BaseCapture.pipe(
  Schema.extend(
    Schema.Struct({
      type: Schema.Literal("image"),
      ugcType: Schema.Literal(1),
      screenshotUrl: Schema.NullOr(Schema.String),
    }),
  ),
);

export const CaptureSchema = Schema.Union(VideoCapture, ImageCapture);

// Define schemas
export const AuthResponse = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.String,
});

export const CapturesResponse = Schema.Struct({
  captures: Schema.Array(CaptureSchema),
});

export class InvalidScope extends Schema.TaggedError<InvalidScope>()(
  "InvalidScope",
  {},
) {}

export class PsnFetchFailed extends Schema.TaggedError<PsnFetchFailed>()(
  "PsnFetchFailed",
  {},
) {}

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
        .setHeaders(Schema.Struct({ Authorization: Schema.String }))
        .addSuccess(CapturesResponse)
        .addError(InvalidScope)
        .addError(PsnFetchFailed),
    ),
  )
  .prefix("/api") {}
