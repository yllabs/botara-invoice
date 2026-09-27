const crypto = require("crypto");
const { getFile, saveFile } = require("../github");

const COOKIE_NAME = "biofyit_user";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function setCookie(res, value, maxAge = COOKIE_MAX_AGE) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
  );
}

function clearCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;

  const [salt, originalHash] = stored.split(":");
  const hash = hashPassword(password, salt);

  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(originalHash, "hex")
  );
}

async function getUsers() {
  const file = await getFile("users.json");
  return file ? file.content : [];
}

module.exports = async function handler(req, res) {
  try {
    const action = String(req.query.action || "").toLowerCase();

    if (action === "register") {
      if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed." });
      }

      const { email, username, password } = req.body || {};

      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanUsername = String(username || "").trim().toLowerCase();
      const cleanPassword = String(password || "");

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, error: "Enter a valid email." });
      }

      if (!/^[a-z0-9_]{3,32}$/.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          error: "Username must be 3-32 characters and only use letters, numbers, and underscores."
        });
      }

      if (cleanPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 8 characters."
        });
      }

      const file = await getFile("users.json");
      const users = file ? file.content : [];

      if (users.some(user => user.username === cleanUsername)) {
        return res.status(409).json({
          success: false,
          error: "That username is already taken."
        });
      }

      if (users.some(user => user.email === cleanEmail)) {
        return res.status(409).json({
          success: false,
          error: "An account with that email already exists."
        });
      }

      const user = {
        id: `user_${crypto.randomBytes(12).toString("hex")}`,
        email: cleanEmail,
        username: cleanUsername,
        passwordHash: createPasswordHash(cleanPassword),
        createdAt: new Date().toISOString()
      };

      users.push(user);

      await saveFile(
        "users.json",
        users,
        file?.sha,
        `Create Biofyit user ${cleanUsername}`
      );

      await saveFile(
        `profiles/${cleanUsername}.json`,
        {
          username: cleanUsername,
          displayName: cleanUsername,
          bio: "",
          profilePicture: "",
          background: "",
          music: "",
          lanyard: {
            enabled: false,
            id: null
          },
          links: []
        },
        null,
        `Create Biofyit profile ${cleanUsername}`
      );

      setCookie(res, user.id);

      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    }

    if (action === "login") {
      if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed." });
      }

      const { email, password } = req.body || {};

      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanPassword = String(password || "");

      const users = await getUsers();

      const user = users.find(item => item.email === cleanEmail);

      if (!user || !verifyPassword(cleanPassword, user.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password."
        });
      }

      setCookie(res, user.id);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    }

    if (action === "session") {
      const cookies = parseCookies(req);
      const userId = cookies[COOKIE_NAME];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Not signed in."
        });
      }

      const users = await getUsers();
      const user = users.find(item => item.id === userId);

      if (!user) {
        clearCookie(res);

        return res.status(401).json({
          success: false,
          error: "Session expired."
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    }

    if (action === "logout") {
      clearCookie(res);

      return res.status(200).json({
        success: true
      });
    }

    if (action === "username") {
      const username = String(req.query.username || "").trim().toLowerCase();

      if (!/^[a-z0-9_]{3,32}$/.test(username)) {
        return res.status(400).json({
          success: false,
          available: false
        });
      }

      const users = await getUsers();
      const exists = users.some(user => user.username === username);

      return res.status(200).json({
        success: true,
        available: !exists
      });
    }

    return res.status(400).json({
      success: false,
      error: "Invalid action."
    });
  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Authentication service error."
    });
  }
};
