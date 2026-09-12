import Stripe from "stripe";

const SETTINGS_NAME = "DropFits Settings";

const defaultSettings = {
  maintenance: false,
  payments: {
    "ps5-car-drop": true,
    "modded-account": true,
    "premium-drop": true
  }
};

async function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing.");
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function getSettingsProduct(stripe) {
  const products = await stripe.products.list({
    limit: 100,
    active: true
  });

  let settingsProduct = products.data.find(
    (product) =>
      product.metadata?.dropfits_settings === "true"
  );

  if (!settingsProduct) {
    settingsProduct = await stripe.products.create({
      name: SETTINGS_NAME,
      metadata: {
        dropfits_settings: "true",
        maintenance: "false",
        payment_ps5_car_drop: "true",
        payment_modded_account: "true",
        payment_premium_drop: "true"
      }
    });
  }

  return settingsProduct;
}

export async function getStoreSettings() {
  const stripe = await getStripe();
  const product = await getSettingsProduct(stripe);

  return {
    maintenance:
      product.metadata?.maintenance === "true",

    payments: {
      "ps5-car-drop":
        product.metadata?.payment_ps5_car_drop !== "false",

      "modded-account":
        product.metadata?.payment_modded_account !== "false",

      "premium-drop":
        product.metadata?.payment_premium_drop !== "false"
    }
  };
}

export async function updateStoreSettings(updates) {
  const stripe = await getStripe();
  const product = await getSettingsProduct(stripe);

  const current = {
    maintenance:
      product.metadata?.maintenance === "true",

    payments: {
      "ps5-car-drop":
        product.metadata?.payment_ps5_car_drop !== "false",

      "modded-account":
        product.metadata?.payment_modded_account !== "false",

      "premium-drop":
        product.metadata?.payment_premium_drop !== "false"
    }
  };

  const next = {
    maintenance:
      typeof updates.maintenance === "boolean"
        ? updates.maintenance
        : current.maintenance,

    payments: {
      ...current.payments,
      ...(updates.payments || {})
    }
  };

  await stripe.products.update(product.id, {
    metadata: {
      dropfits_settings: "true",
      maintenance: String(next.maintenance),
      payment_ps5_car_drop: String(
        next.payments["ps5-car-drop"]
      ),
      payment_modded_account: String(
        next.payments["modded-account"]
      ),
      payment_premium_drop: String(
        next.payments["premium-drop"]
      )
    }
  });

  return next;
}
