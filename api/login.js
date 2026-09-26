const crypto = require("crypto");
const { getFile } = require("./github");

function verifyPassword(password, stored) {
  const parts = String(stored).split(":");

  if (parts.length !== 2) {
    return false;
  }

  const salt = parts[0];
  const originalHash = parts[1];

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(originalHash, "hex")
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    const {
      email,
      password
    } = req.body || {};

    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required."
      });
    }

    const result = await getFile("users.json");

    const users = result?.content || [];

    const user = users.find(
      item => item.email.toLowerCase() === cleanEmail
    );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password."
      });
    }

    res.setHeader(
      "Set-Cookie",
      `biofyit_user=${encodeURIComponent(user.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
    );

    return res.status(200).json({
      success: true,
      username: user.username
    });

  } catch {
    return res.status(500).json({
      success: false,
      error: "Unable to sign in."
    });
  }
};
