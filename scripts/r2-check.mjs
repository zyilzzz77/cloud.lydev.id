import { config } from "dotenv";

config({ path: ".env.local" });

import {
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    ...(process.env.R2_SESSION_TOKEN
      ? { sessionToken: process.env.R2_SESSION_TOKEN }
      : {}),
  },
});

for (const bucket of ["lydev-cdn", "lydev-files"]) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`${bucket}: head ok`);
  } catch (error) {
    console.log(
      `${bucket}: head ${error.name} ${error.$metadata?.httpStatusCode ?? ""} ${error.message}`,
    );
  }

  try {
    const result = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }),
    );
    console.log(`${bucket}: list ok (${result.KeyCount ?? 0})`);
  } catch (error) {
    console.log(
      `${bucket}: list ${error.name} ${error.$metadata?.httpStatusCode ?? ""}`,
    );
  }
}

try {
  await client.send(
    new PutObjectCommand({
      Bucket: "lydev-cdn",
      Key: "_probe/hello.txt",
      Body: "hello",
      ContentType: "text/plain",
    }),
  );
  console.log("probe put ok");
  await client.send(
    new DeleteObjectCommand({ Bucket: "lydev-cdn", Key: "_probe/hello.txt" }),
  );
  console.log("probe delete ok");
} catch (error) {
  console.log(
    `probe put ${error.name} ${error.$metadata?.httpStatusCode ?? ""} ${error.message}`,
  );
}
