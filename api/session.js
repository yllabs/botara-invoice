import crypto from "crypto";

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";

  const parts = cookies.split(";");

  for (const part of parts) {
    const [key, ...value] = part.trim().split("=");

    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }

  return null;
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString();

    const parts = decoded.split("|");

    if (parts.length !== 3) {
      return null;
    }

    const email = parts[0];
    const expires = Number(parts[1]);
    const signature = parts[2];

    if (!email || !expires || !signature) {
      return null;
    }

    if (Date.now() > expires) {
      return null;
    }

    const payload = `${email}|${expires}`;

    const expected = crypto
      .createHmac("sha256", process.env.SESSION_SECRET)
      .update(payload)
      .digest("base64url");

    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )) {
      return null;
    }

    return email;
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  const token = getCookie(req, "biofyit_session");

  if (!token) {
    return res.status(401).json({
      authenticated: false
    });
  }

  const email = verifyToken(token);

  if (!email) {
    return res.status(401).json({
      authenticated: false
    });
  }

  return res.status(200).json({
    authenticated: true,
    email
  });
}
