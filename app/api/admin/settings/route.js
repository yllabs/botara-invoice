import { NextResponse } from "next/server";
import {
  getStoreSettings,
  updateStoreSettings
} from "../../../../lib/storeSettings";
import { requireAdmin } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authorized = await requireAdmin();

    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const settings = await getStoreSettings();

    return NextResponse.json(settings);
  } catch (error) {
    console.error("ADMIN SETTINGS GET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to load store settings."
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authorized = await requireAdmin();

    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const settings = await updateStoreSettings(body);

    return NextResponse.json({
      success: true,
      ...settings
    });
  } catch (error) {
    console.error("ADMIN SETTINGS POST ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to update store settings."
      },
      { status: 500 }
    );
  }
}
