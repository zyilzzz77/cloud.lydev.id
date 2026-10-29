export type DlScanStatus = "clean" | "suspicious" | "malicious" | "unscanned";

export interface DlScanInfo {
  status: DlScanStatus;
  engine: string | null;
  detail: string | null;
  scannedAt: string | null;
}

export interface DlFileDto {
  id: string;
  originalName: string;
  safeSlug: string;
  mimeType: string;
  sizeBytes: number;
  downloads: number;
  expiresAt: string | null;
  createdAt: string;
  publicUrl: string;
  isExpired: boolean;
  hasPassword: boolean;
  /** True for executables, installers, scripts, and disk images. */
  risky: boolean;
  scan: DlScanInfo;
}

export interface DlListResponse {
  items: DlFileDto[];
  page: number;
  limit: number;
  total: number;
}

export interface DlUploadTargetDto {
  fileId: string;
  fileKey: string;
  /** Proves the file id was issued to the caller; required on completion. */
  uploadToken: string;
  safeSlug: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
}
