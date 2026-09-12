import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/admin-auth";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dropfits_admin")?.value;

    if (!verifyAdminToken(token)) {
      return NextResponse.json(
        {
          error: "Unauthorized"
        },
        {
          status: 401
        }
      );
    }

    const sessions = await stripe.checkout.sessions.list({
      limit: 50
    });

    const orders = sessions.data.map((session) => {
      const amount = (session.amount_total || 0) / 100;

      const date = new Date(
        session.created * 1000
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      return {
        id: session.id,
        customer:
          session.customer_details?.email ||
          session.customer_email ||
          "Unknown",
        product:
          session.metadata?.productName ||
          "DropFits Product",
        amount,
        status:
          session.payment_status || "unknown",
        date
      };
    });

    const paidSessions = sessions.data.filter(
      (session) => session.payment_status === "paid"
    );

    const revenue = paidSessions.reduce(
      (total, session) =>
        total + (session.amount_total || 0) / 100,
      0
    );

    return NextResponse.json({
      orders,
      stats: {
        revenue,
        orders: sessions.data.length,
        paid: paidSessions.length
      }
    });
  } catch (error) {
    console.error("Admin orders error:", error);

    return NextResponse.json(
      {
        error: "Unable to load orders."
      },
      {
        status: 500
      }
    );
  }
}
