import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import crypto from "node:crypto";
import Stripe from "stripe";

const PORT = Number(process.env.PORT || 3000);

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

const ROOT = process.cwd();

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const ADMIN_NAME = process.env.ADMIN_NAME || "";
const ADMIN_PIN = process.env.ADMIN_PIN || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";

function sendJson(
  res: ServerResponse,
  status: number,
  data: unknown
) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  res.end(JSON.stringify(data));
}

function sendText(
  res: ServerResponse,
  status: number,
  text: string
) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
  });

  res.end(text);
}

function parseCookies(req: IncomingMessage) {
  const header = req.headers.cookie || "";

  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");

        if (index === -1) {
          return [part, ""];
        }

        return [
          part.slice(0, index),
          decodeURIComponent(part.slice(index + 1)),
        ];
      })
  );
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function createSession() {
  const timestamp = Date.now().toString();

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(timestamp)
    .digest("hex");

  return `${timestamp}.${signature}`;
}

function validSession(token: string | undefined) {
  if (!token || !SESSION_SECRET) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [timestamp, signature] = parts;

  const age = Date.now() - Number(timestamp);

  if (!Number.isFinite(age) || age < 0 || age > 86400000) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
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

function setSessionCookie(res: ServerResponse) {
  const token = createSession();

  res.setHeader(
    "Set-Cookie",
    `dropfits_session=${encodeURIComponent(
      token
    )}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
  );
}

function clearSessionCookie(res: ServerResponse) {
  res.setHeader(
    "Set-Cookie",
    "dropfits_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
  );
}

function isAdmin(req: IncomingMessage) {
  const cookies = parseCookies(req);

  return validSession(cookies.dropfits_session);
}

async function handleCheckout(
  req: IncomingMessage,
  res: ServerResponse
) {
  const body = await readBody(req);

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return sendJson(res, 400, {
      success: false,
      message: "Your cart is empty.",
    });
  }

  let products: any[];

  try {
    products = await import("./products.js");
  } catch {
    return sendJson(res, 500, {
      success: false,
      message: "Product configuration could not be loaded.",
    });
  }

  const catalog = products.default || products.products || products;

  const lineItems = [];

  for (const item of body.items) {
    const product = catalog.find(
      (entry: any) => entry.id === item.id
    );

    if (!product) {
      return sendJson(res, 400, {
        success: false,
        message: "Invalid product.",
      });
    }

    const quantity = Math.min(
      Math.max(Number(item.quantity) || 1, 1),
      10
    );

    lineItems.push({
      quantity,
      price_data: {
        currency: "usd",
        product_data: {
          name: product.name,
          description: product.description,
        },
        unit_amount: Math.round(product.price * 100),
      },
    });
  }

  const siteUrl =
    process.env.SITE_URL ||
    `https://${process.env.VERCEL_URL}`;

  if (!siteUrl) {
    return sendJson(res, 500, {
      success: false,
      message: "SITE_URL is not configured.",
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cancel.html`,
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    metadata: {
      store: "DropFits",
    },
  });

  return sendJson(res, 200, {
    success: true,
    url: session.url,
  });
}

async function handleAdminLogin(
  req: IncomingMessage,
  res: ServerResponse
) {
  const body = await readBody(req);

  const name = String(body.name || "").trim();
  const pin = String(body.pin || "").trim();

  if (!ADMIN_NAME || !ADMIN_PIN || !SESSION_SECRET) {
    return sendJson(res, 500, {
      success: false,
      message: "Admin authentication is not configured.",
    });
  }

  if (name !== ADMIN_NAME || pin !== ADMIN_PIN) {
    return sendJson(res, 401, {
      success: false,
      message: "Invalid name or PIN.",
    });
  }

  setSessionCookie(res);

  return sendJson(res, 200, {
    success: true,
  });
}

async function handleAdminOrders(
  req: IncomingMessage,
  res: ServerResponse
) {
  if (!isAdmin(req)) {
    return sendJson(res, 401, {
      success: false,
      message: "Unauthorized.",
    });
  }

  const sessions = await stripe.checkout.sessions.list({
    limit: 50,
  });

  const orders = sessions.data.map((session) => ({
    id: session.id,
    email: session.customer_details?.email || "No email",
    amount: session.amount_total
      ? session.amount_total / 100
      : 0,
    currency: session.currency,
    status: session.payment_status,
    created: session.created,
    url: session.url,
  }));

  return sendJson(res, 200, {
    success: true,
    orders,
  });
}

async function handleAdminLogout(
  req: IncomingMessage,
  res: ServerResponse
) {
  clearSessionCookie(res);

  return sendJson(res, 200, {
    success: true,
  });
}

async function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
) {
  let requestedPath = pathname === "/" ? "/index.html" : pathname;

  requestedPath = decodeURIComponent(requestedPath);

  const safePath = normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, "");

  const filePath = join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    return sendText(res, 403, "Forbidden");
  }

  if (!existsSync(filePath)) {
    return sendText(res, 404, "Not found");
  }

  const extension = extname(filePath).toLowerCase();
  const contentType =
    MIME_TYPES[extension] || "application/octet-stream";

  const content = await readFile(filePath);

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control":
      extension === ".html"
        ? "no-store"
        : "public, max-age=3600",
  });

  res.end(content);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url || "/",
      `http://${req.headers.host || "localhost"}`
    );

    const pathname = url.pathname;

    if (pathname === "/api/health") {
      return sendJson(res, 200, {
        success: true,
        service: "DropFits",
        status: "online",
      });
    }

    if (
      pathname === "/api/checkout" &&
      req.method === "POST"
    ) {
      return await handleCheckout(req, res);
    }

    if (
      pathname === "/api/admin-login" &&
      req.method === "POST"
    ) {
      return await handleAdminLogin(req, res);
    }

    if (
      pathname === "/api/admin-orders" &&
      req.method === "GET"
    ) {
      return await handleAdminOrders(req, res);
    }

    if (
      pathname === "/api/logout" &&
      req.method === "POST"
    ) {
      return await handleAdminLogout(req, res);
    }

    return await serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);

    return sendJson(res, 500, {
      success: false,
      message: "Internal server error.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`DropFits running on port ${PORT}`);
});
