import { customAlphabet } from "nanoid";

const ALPHABETIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const assetId = customAlphabet(ALPHABETIC, 12);
const dlId = customAlphabet(ALPHABETIC, 10);
const shortSlug = customAlphabet(BASE62, 7);
const apiKeySecret = customAlphabet(BASE62, 40);
const cdnAccessKey = customAlphabet(BASE62, 24);

export function createAssetKey(folder: string, extension: string): string {
  return `${folder}/${assetId()}.${extension}`;
}

export function createDlFileId(): string {
  return dlId();
}

export function createShortSlug(): string {
  return shortSlug();
}

export function createApiKeySecret(): string {
  return `lydev_${apiKeySecret()}`;
}

export function createCdnAccessKey(): string {
  return cdnAccessKey();
}
