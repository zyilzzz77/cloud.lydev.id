import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "lydev_session";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isAppPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/docs") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify-email" ||
    pathname === "/logout" ||
    pathname === "/pricing" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/r" ||
    pathname.startsWith("/r/") ||
    pathname === "/d" ||
    pathname.startsWith("/d/") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg"
  );
}

function hostname(request: NextRequest): string {
  return request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
}

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const secretValue = process.env.JWT_SECRET;
  const issuer = process.env.JWT_ISSUER ?? "cloud.lydev.id";

  if (!secretValue) {
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secretValue), { issuer });
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const host = hostname(request);
  const { pathname, search } = request.nextUrl;
  const isLocal = LOCAL_HOSTS.has(host);

  if (host === "uri.lydev.id") {
    if (pathname === "/") {
      return NextResponse.redirect(process.env.APP_URL ?? "https://cloud.lydev.id");
    }

    if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(new URL(`/r${pathname}`, request.url));
  }

  if (host === "dl.lydev.id") {
    if (pathname === "/") {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(new URL(`/d${pathname}`, request.url));
  }

  const isCloudHost = isLocal || host === "cloud.lydev.id";

  if (!isCloudHost) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (isLocal) {
    const legacyDownload = /^\/[A-Za-z]{10}\/.+$/.test(pathname);

    if (legacyDownload) {
      return NextResponse.rewrite(new URL(`/d${pathname}`, request.url));
    }

    const legacyShortLink = /^\/[A-Za-z0-9_-]{3,32}\/?$/.test(pathname);

    if (legacyShortLink && !isAppPath(pathname)) {
      return NextResponse.rewrite(new URL(`/r${pathname}`, request.url));
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const valid = await hasValidSession(token);

    if (!valid) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
