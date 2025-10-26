import { Schema } from "effect";

export const BaseCaptureSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  game: Schema.NullOr(Schema.String),
  preview: Schema.NullOr(Schema.String),
  createdAt: Schema.NullOr(Schema.String),
  titleImageUrl: Schema.NullOr(Schema.String),
});

export const VideoCaptureSchema = BaseCaptureSchema.pipe(
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

export const ImageCaptureSchema = BaseCaptureSchema.pipe(
  Schema.extend(
    Schema.Struct({
      type: Schema.Literal("image"),
      ugcType: Schema.Literal(1),
      screenshotUrl: Schema.NullOr(Schema.String),
    }),
  ),
);

export const CaptureSchema = Schema.Union(
  VideoCaptureSchema,
  ImageCaptureSchema,
);

export const RawCaptureSchema = Schema.Struct({
  id: Schema.String,
  language: Schema.String,
  title: Schema.String,
  scePlatform: Schema.String,
  sceUserOnlineId: Schema.String,
  sceTitleAgeRating: Schema.Number,
  sceTitleId: Schema.String,
  sceTitleName: Schema.NullOr(Schema.String),
  videoDuration: Schema.optional(Schema.Number),
  cloudStatus: Schema.String,
  serviceType: Schema.String,
  uploadDate: Schema.String,
  archived: Schema.optional(Schema.Boolean),
  videoUrl: Schema.optional(Schema.String),
  screenshotUrl: Schema.optional(Schema.String),
  npCommId: Schema.String,
  sceUserAccountId: Schema.String,
  ugcType: Schema.Number,
  titleImageUrl: Schema.optional(Schema.String),
  largePreviewImage: Schema.optional(Schema.String),
  smallPreviewImage: Schema.optional(Schema.String),
  category: Schema.String,
  transcodeStatus: Schema.String,
  transcodeProgress: Schema.optional(Schema.String),
  transcodeError: Schema.optional(Schema.String),
  isSpoiler: Schema.Boolean,
  conceptId: Schema.String,
  sourceOfMedia: Schema.String,
  sourceUgcId: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
  captureType: Schema.String,
  fileType: Schema.String,
  fileSize: Schema.Number,
  resolution: Schema.String,
  expireAt: Schema.String,
  downloadUrl: Schema.optional(Schema.String),
  transcodeJobId: Schema.optional(Schema.String),
  colorRange: Schema.optional(Schema.String),
  uploadId: Schema.optional(Schema.String),
});

export const PsnCapturesResponseSchema = Schema.Struct({
  ugcDocument: Schema.Array(RawCaptureSchema),
  nextCursorMark: Schema.optional(Schema.String),
  limit: Schema.Number,
}).pipe(
  Schema.transform(Schema.Struct({ captures: Schema.Array(CaptureSchema) }), {
    strict: false,
    decode: ({ ugcDocument }) => ({
      captures: ugcDocument.map((d) => {
        const base = {
          id: d.id,
          title: d.title ?? d.sceTitleName ?? "Capture",
          game: d.sceTitleName ?? null,
          preview: d.largePreviewImage ?? null,
          createdAt: d.uploadDate,
          titleImageUrl: d.titleImageUrl ?? null,
        };
        if (d.ugcType === 2) {
          return {
            ...base,
            type: "video" as const,
            duration: d.videoDuration ?? null,
            downloadUrl: d.downloadUrl ?? null,
            videoUrl: d.videoUrl ?? null,
            ugcType: 2,
          };
        } else {
          return {
            ...base,
            type: "image" as const,
            ugcType: 1,
            screenshotUrl: d.screenshotUrl ?? null,
          };
        }
      }),
    }),
    encode: () => {
      throw new Error("Encoding not supported");
    },
  }),
);

export type Capture = typeof CaptureSchema.Type;
export type VideoCapture = typeof VideoCaptureSchema.Type;
export type ImageCapture = typeof ImageCaptureSchema.Type;
export type RawCapture = typeof RawCaptureSchema.Type;
