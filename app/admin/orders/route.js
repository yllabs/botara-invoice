import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "../../../lib/adminAuth";

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

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY is missing." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sessions = await stripe.checkout.sessions.list({
      limit: 100
    });

    const orders = sessions.data.map((session) => ({
      id: session.id,
      productId: session.metadata?.productId || "unknown",
      productName:
        session.metadata?.productName || "Unknown Product",
      customerEmail:
        session.customer_details?.email || "No email",
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      paymentStatus:
        session.payment_status || "unknown",
      status: session.status || "unknown",
      created: session.created
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("ADMIN ORDERS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Unable to load orders."
      },
      { status: 500 }
    );
  }
}
