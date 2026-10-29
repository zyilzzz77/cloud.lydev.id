import { config } from "dotenv";
import postgres from "postgres";
import { PLANS, formatPlanPrice, isPlanId, PLAN_ORDER } from "../src/lib/plans";

config({ path: ".env.local" });
config();

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://lydev@127.0.0.1:55432/lydev_cloud";

async function main(): Promise<void> {
  const [identifier, planId] = process.argv.slice(2);

  if (!identifier || !planId || !isPlanId(planId)) {
    console.error(
      `Usage: pnpm plan:set <email-or-username> <${PLAN_ORDER.join("|")}>`,
    );
    process.exit(1);
  }

  const plan = PLANS[planId];
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const rows = await sql<{ id: string; email: string; plan: string }[]>`
      select id, email, plan from users
      where email = ${identifier.trim().toLowerCase()} or username = ${identifier.trim().toLowerCase()}
      limit 1
    `;

    const user = rows[0];

    if (!user) {
      console.error(`No account matches "${identifier}".`);
      process.exit(1);
    }

    if (user.plan === planId) {
      console.log(`${user.email} is already on the ${plan.name} plan.`);
      return;
    }

    await sql.begin(async (tx) => {
      await tx`
        update users
        set plan = ${planId}::plan,
            storage_quota_bytes = ${plan.limits.storageBytes},
            updated_at = now()
        where id = ${user.id}
      `;

      await tx`
        update plan_upgrade_requests
        set status = 'approved', resolved_at = now()
        where user_id = ${user.id} and status = 'pending'
      `;
    });

    console.log(
      `${user.email}: ${user.plan} -> ${plan.name} (${formatPlanPrice(plan.priceIdr)}/mo, ${plan.limits.storageBytes / 1024 ** 3} GB).`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
