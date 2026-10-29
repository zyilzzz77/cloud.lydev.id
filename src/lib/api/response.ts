import { NextResponse } from "next/server";
import type { AppError } from "@/lib/errors";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function fail(error: AppError): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    },
    { status: error.status },
  );
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
