import { NextResponse } from "next/server";
import crypto from "crypto";

function verifyToken(token) {
  if (!token || !process.env.ADMIN_SECRET) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const timestamp = parts[0];
  const signature = parts[1];

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const twelveHours = 12 * 60 * 60 * 1000;

  if (
    Date.now() - timestampNumber > twelveHours ||
    Date.now() - timestampNumber < 0
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", process.env.ADMIN_SECRET)
    .update(timestamp)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/admin/dashboard") ||
    pathname.startsWith("/api/admin/orders")
  ) {
    const token = request.cookies.get(
      "dropfits_admin"
    )?.value;

    if (!verifyToken(token)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Unauthorized"
          },
          {
            status: 401
          }
        );
      }

      return NextResponse.redirect(
        new URL("/admin", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/dashboard/:path*",
    "/api/admin/orders/:path*"
  ]
};
