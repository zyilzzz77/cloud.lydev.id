import { NextResponse } from "next/server";
import { AppError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { fail } from "@/lib/api/response";

type RouteHandler<TContext> = (request: Request, context: TContext) => Promise<Response>;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isAllowedOrigin(origin: string, requestUrl: string): boolean {
  try {
    const originHost = new URL(origin).host;
    const appHost = new URL(process.env.APP_URL ?? "http://localhost:3000").host;
    const requestHost = new URL(requestUrl).host;

    return (
      originHost === appHost ||
      originHost === requestHost ||
      originHost === "localhost:3000" ||
      originHost === "127.0.0.1:3000"
    );
  } catch {
    return false;
  }
}

function assertTrustedOrigin(request: Request): void {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const origin = request.headers.get("origin");

  if (origin && !isAllowedOrigin(origin, request.url)) {
    throw new AppError("FORBIDDEN", "Invalid request origin.", 403);
  }
}

export function route<TContext = unknown>(
  handler: RouteHandler<TContext>,
): RouteHandler<TContext> {
  return async (request, context) => {
    try {
      assertTrustedOrigin(request);

      return await handler(request, context);
    } catch (error) {
      if (isAppError(error)) {
        return fail(error);
      }

      logger.error({ err: error, url: request.url }, "Unhandled route error");

      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Something went wrong.",
          },
        },
        { status: 500 },
      );
    }
  };
}
