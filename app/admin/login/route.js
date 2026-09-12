import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function createToken() {
  const timestamp = Date.now().toString();

  const signature = crypto
    .createHmac("sha256", process.env.ADMIN_SECRET)
    .update(timestamp)
    .digest("hex");

  return `${timestamp}.${signature}`;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const pin = String(body.pin || "").trim();

    const adminName = process.env.ADMIN_NAME;
    const adminPin = process.env.ADMIN_PIN;

    if (!adminName || !adminPin || !process.env.ADMIN_SECRET) {
      return NextResponse.json(
        {
          error: "Admin authentication is not configured."
        },
        {
          status: 500
        }
      );
    }

    if (name !== adminName || pin !== adminPin) {
      return NextResponse.json(
        {
          error: "Invalid admin name or PIN."
        },
        {
          status: 401
        }
      );
    }

    const token = createToken();

    const response = NextResponse.json({
      success: true
    });

    response.cookies.set("dropfits_admin", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 12
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request."
      },
      {
        status: 400
      }
    );
  }
}
