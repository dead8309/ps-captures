import * as HttpApi from "@effect/platform/HttpApi";
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as Schema from "effect/Schema";

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
  tokenizedSupported: Schema.Boolean,
});

// Error schemas with discriminated unions
const MissingNpssoError = Schema.Struct({
  _tag: Schema.Literal("MissingNpsso"),
  error: Schema.Literal("NPSSO token required"),
});

const AuthFailedError = Schema.Struct({
  _tag: Schema.Literal("AuthFailed"),
  error: Schema.Literal("Authentication failed"),
});

const MissingRefreshTokenError = Schema.Struct({
  _tag: Schema.Literal("MissingRefreshToken"),
  error: Schema.Literal("Refresh token required"),
});

const RefreshFailedError = Schema.Struct({
  _tag: Schema.Literal("RefreshFailed"),
  error: Schema.Literal("Token refresh failed"),
});

const MissingBearerTokenError = Schema.Struct({
  _tag: Schema.Literal("MissingBearerToken"),
  error: Schema.Literal("Missing Bearer token"),
});

const InvalidScopeError = Schema.Struct({
  _tag: Schema.Literal("InvalidScope"),
  error: Schema.Literal("Your PSN access token appears to be missing Media Gallery permissions. Please generate a Bearer token from the PlayStation App NPSSO flow."),
  status: Schema.Literal(401),
  psnBody: Schema.String,
});

const PsnFetchFailedError = Schema.Struct({
  _tag: Schema.Literal("PsnFetchFailed"),
  error: Schema.Literal("PSN fetch failed"),
  status: Schema.Number,
  body: Schema.String,
});

// Endpoint-specific error unions
export const AuthErrors = Schema.Union(MissingNpssoError, AuthFailedError);
export const RefreshErrors = Schema.Union(MissingRefreshTokenError, RefreshFailedError);
export const CapturesErrors = Schema.Union(MissingBearerTokenError, InvalidScopeError, PsnFetchFailedError);

// Define the API
export class PsnApi extends HttpApi.make("psn")
  .add(
    HttpApiGroup.make("auth")
      .add(
        HttpApiEndpoint.post("authenticate", "/auth")
          .setPayload(Schema.Struct({ npsso: Schema.String }))
          .addSuccess(AuthResponse)
          .addError(AuthErrors),
      )
      .add(
        HttpApiEndpoint.post("refresh", "/refresh")
          .setPayload(Schema.Struct({ refresh_token: Schema.String }))
          .addSuccess(AuthResponse)
          .addError(RefreshErrors),
      ),
  )
  .add(
    HttpApiGroup.make("captures").add(
      HttpApiEndpoint.get("list", "/captures")
        .setHeaders(Schema.Struct({ Authorization: Schema.String }))
        .addSuccess(CapturesResponse)
        .addError(CapturesErrors),
    ),
  ) {}

