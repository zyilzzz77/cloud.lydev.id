import { config } from "dotenv";

config({ path: ".env.local" });

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

for (const bucket of [
  process.env.R2_CDN_BUCKET ?? "lydev-cdn",
  process.env.R2_FILES_BUCKET ?? "lydev-files",
]) {
  console.log(`--- ${bucket}`);
  let token;
  do {
    const result = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
    );
    for (const item of result.Contents ?? []) {
      console.log(`${item.Key} (${item.Size})`);
    }
    token = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (token);
}
