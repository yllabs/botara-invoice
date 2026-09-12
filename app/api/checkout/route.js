import Stripe from "stripe";
import { NextResponse } from "next/server";

const products = {
  "ps5-car-drop": {
    name: "PS5 Car Drop",
    amount: 1499
  },

  "modded-account": {
    name: "Modded Account",
    amount: 3999
  },

  "premium-drop": {
    name: "Premium Drop",
    amount: 2499
  }
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const productId = formData.get("productId");

    const product = products[productId];

    if (!product) {
      return NextResponse.json(
        {
          error: "Product not found."
        },
        {
          status: 400
        }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          error: "STRIPE_SECRET_KEY is missing from the Vercel environment."
        },
        {
          status: 500
        }
      );
    }

    const stripe = new Stripe(secretKey);

    const origin =
      request.headers.get("origin") ||
      "https://dropfits.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "usd",

            product_data: {
              name: product.name
            },

            unit_amount: product.amount
          },

          quantity: 1
        }
      ],

      success_url: `${origin}/success`,
      cancel_url: `${origin}/#products`
    });

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("STRIPE ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Unknown Stripe error.",
        type: error?.type || "Unknown",
        code: error?.code || "Unknown"
      },
      {
        status: 500
      }
    );
  }
}
