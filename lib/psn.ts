export type RawCapture = {
  id: string;
  language: string;
  title: string;
  scePlatform: string;
  sceUserOnlineId: string;
  sceTitleAgeRating: number;
  sceTitleId: string;
  sceTitleName: string | null;
  videoDuration?: number;
  cloudStatus: string;
  serviceType: string;
  uploadDate: string;
  archived?: boolean;
  videoUrl?: string;
  screenshotUrl?: string;
  npCommId: string;
  sceUserAccountId: string;
  ugcType: number;
  titleImageUrl?: string;
  largePreviewImage?: string;
  smallPreviewImage?: string;
  category: string;
  transcodeStatus: string;
  transcodeProgress?: string;
  transcodeError?: string;
  isSpoiler: boolean;
  conceptId: string;
  sourceOfMedia: string;
  sourceUgcId: string;
  start: number;
  end: number;
  captureType: string;
  fileType: string;
  fileSize: number;
  resolution: string;
  expireAt: string;
  downloadUrl?: string;
  transcodeJobId?: string;
  colorRange?: string;
  uploadId: string;
};

export type BaseCapture = {
  id: string;
  title: string;
  game: string | null;
  preview: string | null;
  createdAt: string | null;
  titleImageUrl: string | null;
};

export type VideoCapture = BaseCapture & {
  type: "video";
  duration: number | null;
  downloadUrl: string | null;
  ugcType: 2;
};

export type ImageCapture = BaseCapture & {
  type: "image";
  ugcType: 1;
};

export type Capture = VideoCapture | ImageCapture;

export const PSN_BASE_URL =
  "https://m.np.playstation.com/api/gameMediaService/v2/c2s/category/cloudMediaGallery/ugcType/all";
