import { NextResponse } from "next/server";
import { sql } from "@/db";
import { getCacheStore } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  let postgres = false;

  try {
    await sql`select 1`;
    postgres = true;
  } catch {
    postgres = false;
  }

  let redis = false;

  try {
    redis = await getCacheStore().ping();
  } catch {
    redis = false;
  }

  return NextResponse.json(
    {
      data: {
        status: postgres ? "ok" : "degraded",
        postgres,
        redis,
        version: "0.1.0",
      },
    },
    { status: postgres ? 200 : 503 },
  );
}
