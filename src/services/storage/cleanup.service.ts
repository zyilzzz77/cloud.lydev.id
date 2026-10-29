import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { dlFiles, users } from "@/db/schema";
import { listExpiredDlFiles } from "@/repositories/dl-file.repository";
import { getStorage } from "@/services/storage/storage.service";

export async function cleanupExpiredDlFiles(limit = 200): Promise<number> {
  const rows = await listExpiredDlFiles(limit);
  let removed = 0;

  for (const row of rows) {
    await getStorage().deleteObject(row.cosObjectKey);

    await db.transaction(async (tx) => {
      await tx.delete(dlFiles).where(eq(dlFiles.id, row.id));
      await tx
        .update(users)
        .set({
          storageUsedBytes: sql`greatest(0, ${users.storageUsedBytes} - ${row.sizeBytes})`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.userId));
    });

    removed += 1;
  }

  return removed;
}
