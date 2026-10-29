import { config } from "dotenv";
import { hash } from "@node-rs/argon2";
import postgres from "postgres";

config({ path: ".env.local" });
config();

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://lydev@127.0.0.1:55432/lydev_cloud";

const username = "lydev";
const email = "lydev@lydev.id";
const password = "123456";

async function main(): Promise<void> {
  const isLocalDatabase =
    databaseUrl.includes("127.0.0.1") ||
    databaseUrl.includes("localhost") ||
    databaseUrl.includes("[::1]");

  if (!isLocalDatabase) {
    throw new Error("Refusing to seed a development user outside a local database.");
  }

  const passwordHash = await hash(password, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const rows = await sql<{ id: string }[]>`
      select id from users where username = ${username} or email = ${email} limit 1
    `;

    const existing = rows[0];

    if (existing) {
      await sql`
        update users
        set username = ${username},
            email = ${email},
            password_hash = ${passwordHash},
            email_verified_at = now(),
            updated_at = now()
        where id = ${existing.id}
      `;
    } else {
      await sql`
        insert into users (username, email, password_hash, email_verified_at)
        values (${username}, ${email}, ${passwordHash}, now())
      `;
    }

    console.log(`Seeded development user: ${username} / ${password}`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
