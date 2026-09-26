import crypto from "crypto";

function safeEqual(a, b) {
  const first = Buffer.from(a || "");
  const second = Buffer.from(b || "");

  if (first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(first, second);
}

function createToken(email) {
  const expires = Date.now() + 86400000;
  const payload = `${email}|${expires}`;

  const signature = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("base64url");

  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required."
      });
    }

    const accounts = [
      {
        email: process.env.BIOFYIT_ADMIN_EMAIL,
        password: process.env.BIOFYIT_ADMIN_PASSWORD
      },
      {
        email: process.env.BIOFYIT_DEVELOPER_EMAIL,
        password: process.env.BIOFYIT_DEVELOPER_PASSWORD
      }
    ];

    const account = accounts.find((user) => {
      return (
        user.email &&
        user.password &&
        safeEqual(email.toLowerCase(), user.email.toLowerCase()) &&
        safeEqual(password, user.password)
      );
    });

    if (!account) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password."
      });
    }

    const token = createToken(account.email);

    res.setHeader(
      "Set-Cookie",
      `biofyit_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
    );

    return res.status(200).json({
      success: true
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: "Authentication failed."
    });
  }
}
