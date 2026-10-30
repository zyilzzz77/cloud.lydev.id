import { config } from "dotenv";
import postgres from "postgres";
import { TRANSFER_TOPUPS } from "../src/lib/plans";
import { transferPeriodStart } from "../src/lib/transfer";

config({ path: ".env.local" });
config();

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://lydev@127.0.0.1:55432/lydev_cloud";

function formatBytes(bytes: number): string {
  return `${Math.round((bytes / 1024 ** 3) * 100) / 100} GB`;
}

async function main(): Promise<void> {
  const [identifier, topUpId] = process.argv.slice(2);

  if (!identifier) {
    console.error(
      `Usage: pnpm topup:approve <email-or-username> [${TRANSFER_TOPUPS.map((t) => t.id).join("|")}]`,
    );
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const rows = await sql<{ id: string; email: string; transfer_bonus_bytes: number; storage_bonus_bytes: number }[]>`
      select id, email, transfer_bonus_bytes, storage_bonus_bytes from users
      where email = ${identifier.trim().toLowerCase()} or username = ${identifier.trim().toLowerCase()}
      limit 1
    `;

    const user = rows[0];

    if (!user) {
      console.error(`No account matches "${identifier}".`);
      process.exit(1);
    }

    const pending = topUpId
      ? await sql<{ id: string; top_up_id: string; bytes: number; storage_bytes: number; price_idr: number }[]>`
          select id, top_up_id, bytes, storage_bytes, price_idr from transfer_topups
          where user_id = ${user.id} and status = 'pending' and top_up_id = ${topUpId}
          order by created_at desc limit 1
        `
      : await sql<{ id: string; top_up_id: string; bytes: number; storage_bytes: number; price_idr: number }[]>`
          select id, top_up_id, bytes, storage_bytes, price_idr from transfer_topups
          where user_id = ${user.id} and status = 'pending'
          order by created_at desc limit 1
        `;

    const topUp = pending[0];

    if (!topUp) {
      console.error(`${user.email} has no pending top-up${topUpId ? ` for ${topUpId}` : ""}.`);
      process.exit(1);
    }

    // Same UTC month boundary the app uses, so the bonus lines up with the
    // counter that bandwidth_used_bytes is reset against.
    const period = transferPeriodStart(new Date()).toISOString();

    await sql.begin(async (tx) => {
      await tx`
        update transfer_topups
        set status = 'approved', resolved_at = now()
        where id = ${topUp.id}
      `;

      // Bytes bought in a previous month are dropped, never carried over.
      await tx`
        update users
        set transfer_bonus_bytes = case
              when transfer_bonus_period_start >= ${period}::timestamptz
                then transfer_bonus_bytes + ${topUp.bytes}
              else ${topUp.bytes}
            end,
            transfer_bonus_period_start = ${period}::timestamptz,
            storage_bonus_bytes = case
              when storage_bonus_period_start >= ${period}::timestamptz
                then storage_bonus_bytes + ${topUp.storage_bytes}
              else ${topUp.storage_bytes}
            end,
            storage_bonus_period_start = ${period}::timestamptz,
            updated_at = now()
        where id = ${user.id}
      `;
    });

    console.log(
      `${user.email}: +${formatBytes(topUp.bytes)} transfer and +${formatBytes(topUp.storage_bytes)} storage approved (Rp ${topUp.price_idr.toLocaleString("id-ID")}).`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
