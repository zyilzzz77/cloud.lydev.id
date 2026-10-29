export type AssetFolder = "images" | "videos" | "raw";

export interface CdnAssetDto {
  id: string;
  userId: string;
  bucketId: string | null;
  fileKey: string;
  folder: AssetFolder;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: "private" | "public";
  /** Present on private assets; required to read the object. */
  accessKey: string | null;
  createdAt: string;
  publicUrl: string;
}

export interface CdnBucketDto {
  id: string;
  name: string;
  assetCount: number;
  createdAt: string;
}

export interface CdnBucketListResponse {
  items: CdnBucketDto[];
}

export interface CdnListResponse {
  items: CdnAssetDto[];
  page: number;
  limit: number;
  total: number;
}

export interface CdnUploadTargetDto {
  fileKey: string;
  /** Proves the key was issued to the caller; required on completion. */
  uploadToken: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
}
